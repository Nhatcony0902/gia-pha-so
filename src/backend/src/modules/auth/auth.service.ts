import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { VerificationPurpose, type User } from "@prisma/client";
import * as argon2 from "argon2";
import { OAuth2Client } from "google-auth-library";
import { randomInt, randomUUID } from "node:crypto";
import { PrismaService } from "../database/prisma.service.js";
import { MailService } from "../mail/mail.service.js";
import type {
  GoogleDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyCodeDto,
} from "./auth.dto.js";

const OTP_TTL_MS = 10 * 60_000;
const RESEND_DELAY_MS = 60_000;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60_000;
const RESET_TTL_MS = 10 * 60_000;

type ClientInfo = { userAgent?: string; ipAddress?: string };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly google = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(MailService) private readonly mail: MailService,
  ) {}

  normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private publicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      hasPassword: Boolean(user.passwordHash),
    };
  }

  private async createChallenge(input: {
    email: string;
    purpose: VerificationPurpose;
    pendingName?: string;
    pendingPasswordHash?: string;
    ignoreCooldown?: boolean;
  }) {
    const current = await this.prisma.verificationChallenge.findFirst({
      where: { email: input.email, purpose: input.purpose, usedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (
      !input.ignoreCooldown &&
      current &&
      current.resendAvailableAt > new Date()
    ) {
      throw new ConflictException({
        code: "OTP_RESEND_TOO_SOON",
        message: "Vui lòng chờ 60 giây trước khi yêu cầu mã mới",
      });
    }
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const challenge = await this.prisma.$transaction(async (tx) => {
      await tx.verificationChallenge.updateMany({
        where: { email: input.email, purpose: input.purpose, usedAt: null },
        data: { usedAt: new Date() },
      });
      return tx.verificationChallenge.create({
        data: {
          email: input.email,
          purpose: input.purpose,
          codeHash: await argon2.hash(code),
          pendingName: input.pendingName,
          pendingPasswordHash: input.pendingPasswordHash,
          expiresAt: new Date(Date.now() + OTP_TTL_MS),
          resendAvailableAt: new Date(Date.now() + RESEND_DELAY_MS),
        },
      });
    });
    return { challenge, code };
  }

  private async verifyChallenge(
    email: string,
    code: string,
    purpose: VerificationPurpose,
  ) {
    const challenge = await this.prisma.verificationChallenge.findFirst({
      where: { email, purpose, usedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (!challenge || challenge.expiresAt <= new Date()) {
      throw new BadRequestException({
        code: "OTP_EXPIRED",
        message: "Mã xác thực không tồn tại hoặc đã hết hạn",
      });
    }
    if (challenge.attempts >= 5) {
      throw new BadRequestException({
        code: "OTP_ATTEMPTS_EXCEEDED",
        message: "Bạn đã nhập sai quá nhiều lần. Hãy yêu cầu mã mới",
      });
    }
    if (!(await argon2.verify(challenge.codeHash, code))) {
      await this.prisma.verificationChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException({
        code: "OTP_INVALID",
        message: "Mã xác thực không chính xác",
      });
    }
    return challenge;
  }

  async register(dto: RegisterDto) {
    if (dto.password !== dto.passwordConfirmation)
      throw new BadRequestException({
        code: "PASSWORD_MISMATCH",
        message: "Mật khẩu xác nhận không khớp",
      });
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      throw new ConflictException({
        code: "EMAIL_ALREADY_EXISTS",
        message: "Email đã được sử dụng",
      });
    }
    const { code } = await this.createChallenge({
      email,
      purpose: VerificationPurpose.REGISTER,
      pendingName: dto.name.trim(),
      pendingPasswordHash: await argon2.hash(dto.password),
    });
    await this.mail.sendVerificationCode({
      email,
      name: dto.name.trim(),
      code,
      purpose: "register",
    });
    return {
      message: "Mã xác thực đã được gửi",
      expiresInSeconds: OTP_TTL_MS / 1000,
    };
  }

  async resendRegistration(emailInput: string) {
    const email = this.normalizeEmail(emailInput);
    if (await this.prisma.user.findUnique({ where: { email } }))
      throw new ConflictException({
        code: "EMAIL_ALREADY_EXISTS",
        message: "Email đã được sử dụng",
      });
    const previous = await this.prisma.verificationChallenge.findFirst({
      where: { email, purpose: VerificationPurpose.REGISTER, usedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (!previous?.pendingName || !previous.pendingPasswordHash)
      throw new BadRequestException({
        code: "REGISTRATION_NOT_STARTED",
        message: "Không tìm thấy yêu cầu đăng ký",
      });
    const { code } = await this.createChallenge({
      email,
      purpose: VerificationPurpose.REGISTER,
      pendingName: previous.pendingName,
      pendingPasswordHash: previous.pendingPasswordHash,
    });
    await this.mail.sendVerificationCode({
      email,
      name: previous.pendingName,
      code,
      purpose: "register",
    });
    return {
      message: "Mã xác thực mới đã được gửi",
      expiresInSeconds: OTP_TTL_MS / 1000,
    };
  }

  async verifyRegistration(dto: VerifyCodeDto, client: ClientInfo) {
    const email = this.normalizeEmail(dto.email);
    const challenge = await this.verifyChallenge(
      email,
      dto.code,
      VerificationPurpose.REGISTER,
    );
    if (!challenge.pendingName || !challenge.pendingPasswordHash)
      throw new BadRequestException({
        code: "INVALID_CHALLENGE",
        message: "Yêu cầu đăng ký không hợp lệ",
      });
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          name: challenge.pendingName!,
          passwordHash: challenge.pendingPasswordHash!,
          emailVerifiedAt: new Date(),
        },
      });
      await tx.verificationChallenge.updateMany({
        where: { email, purpose: VerificationPurpose.REGISTER, usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.notification.create({
        data: {
          userId: created.id,
          type: "ACCOUNT_WELCOME",
          sourceType: "SYSTEM",
          sourceName: "Hệ thống",
          title: "'Đăng ký thành công",
          message: `Chào mừng ${created.name} đến với Gia Phả Số`,
          actionUrl: "/trees",
        },
      });
      return created;
    });
    return this.issueSession(user, client);
  }

  async login(dto: LoginDto, client: ClientInfo) {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (
      !user?.passwordHash ||
      !(await argon2.verify(user.passwordHash, dto.password))
    ) {
      throw new UnauthorizedException({
        code: "INVALID_CREDENTIALS",
        message: "Email hoặc mật khẩu không chính xác",
      });
    }
    return this.issueSession(user, client);
  }

  async googleLogin(dto: GoogleDto, client: ClientInfo) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId)
      throw new BadRequestException({
        code: "GOOGLE_NOT_CONFIGURED",
        message: "Đăng nhập Google chưa được cấu hình",
      });
    let ticket;
    try {
      ticket = await this.google.verifyIdToken({
        idToken: dto.credential,
        audience: clientId,
      });
    } catch (error: unknown) {
      this.logger.error(
        `Google ID token verification failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new UnauthorizedException({
        code: "GOOGLE_TOKEN_INVALID",
        message: "Thông tin xác thực Google không hợp lệ hoặc đã hết hạn",
      });
    }
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || !payload.email_verified)
      throw new UnauthorizedException({
        code: "GOOGLE_TOKEN_INVALID",
        message: "Tài khoản Google chưa được xác minh",
      });
    const email = this.normalizeEmail(payload.email);
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleSubject: payload.sub }, { email }] },
    });
    if (user?.googleSubject && user.googleSubject !== payload.sub)
      throw new ConflictException({
        code: "GOOGLE_ACCOUNT_CONFLICT",
        message: "Email đã liên kết với tài khoản Google khác",
      });
    if (user) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleSubject: payload.sub,
          avatarUrl: user.avatarUrl ?? payload.picture,
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        },
      });
    } else {
      user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email,
            name: payload.name ?? email.split("@")[0]!,
            googleSubject: payload.sub,
            avatarUrl: payload.picture,
            emailVerifiedAt: new Date(),
          },
        });
        await tx.notification.create({
          data: {
            userId: created.id,
            type: "ACCOUNT_WELCOME",
            sourceType: "SYSTEM",
            sourceName: "Hệ thống",
            title: "Đăng ký thành công",
            message: `Chào mừng ${created.name} đến với Gia Phả Số`,
            actionUrl: "/trees",
          },
        });
        return created;
      });
    }
    await this.prisma.verificationChallenge.updateMany({
      where: { email, purpose: VerificationPurpose.REGISTER, usedAt: null },
      data: { usedAt: new Date() },
    });
    return this.issueSession(user, client);
  }

  async requestPasswordReset(emailInput: string) {
    const email = this.normalizeEmail(emailInput);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      throw new BadRequestException({
        code: "PASSWORD_RESET_UNAVAILABLE",
        message: "Email không hợp lệ",
      });
    }
    const recent = await this.prisma.verificationChallenge.findFirst({
      where: {
        email,
        purpose: VerificationPurpose.PASSWORD_RESET,
        usedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
    if (!recent || recent.resendAvailableAt <= new Date()) {
      const { code } = await this.createChallenge({
        email,
        purpose: VerificationPurpose.PASSWORD_RESET,
      });
      await this.mail.sendVerificationCode({
        email,
        name: user.name,
        code,
        purpose: "reset",
      });
    }
    return {
      message: "Mã xác thực đã được gửi tới email của bạn",
    };
  }

  async verifyPasswordReset(dto: VerifyCodeDto) {
    const email = this.normalizeEmail(dto.email);
    const challenge = await this.verifyChallenge(
      email,
      dto.code,
      VerificationPurpose.PASSWORD_RESET,
    );
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash)
      throw new BadRequestException({
        code: "RESET_NOT_AVAILABLE",
        message: "Không thể khôi phục mật khẩu cho tài khoản này",
      });
    const tokenId = randomUUID();
    const expiresAt = new Date(Date.now() + RESET_TTL_MS);
    await this.prisma.$transaction([
      this.prisma.verificationChallenge.update({
        where: { id: challenge.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.passwordResetToken.create({
        data: { id: tokenId, userId: user.id, expiresAt },
      }),
    ]);
    const resetToken = await this.jwt.signAsync(
      { sub: user.id, jti: tokenId, type: "password-reset" },
      {
        secret:
          process.env.PASSWORD_RESET_SECRET ??
          "development-reset-secret-change-me",
        expiresIn: "10m",
      },
    );
    return { resetToken, expiresInSeconds: RESET_TTL_MS / 1000 };
  }

  async confirmPasswordReset(dto: ResetPasswordDto) {
    if (dto.password !== dto.passwordConfirmation)
      throw new BadRequestException({
        code: "PASSWORD_MISMATCH",
        message: "Mật khẩu xác nhận không khớp",
      });
    let payload: { sub: string; jti: string; type: string };
    try {
      payload = await this.jwt.verifyAsync(dto.resetToken, {
        secret:
          process.env.PASSWORD_RESET_SECRET ??
          "development-reset-secret-change-me",
      });
    } catch {
      throw new UnauthorizedException({
        code: "RESET_TOKEN_INVALID",
        message: "Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn",
      });
    }
    if (payload.type !== "password-reset")
      throw new UnauthorizedException({
        code: "RESET_TOKEN_INVALID",
        message: "Phiên đặt lại mật khẩu không hợp lệ",
      });
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { id: payload.jti },
    });
    if (
      !record ||
      record.userId !== payload.sub ||
      record.usedAt ||
      record.expiresAt <= new Date()
    )
      throw new UnauthorizedException({
        code: "RESET_TOKEN_INVALID",
        message: "Phiên đặt lại mật khẩu đã được sử dụng hoặc hết hạn",
      });
    const passwordHash = await argon2.hash(dto.password);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: payload.sub },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.updateMany({
        where: { userId: payload.sub, usedAt: null },
        data: { usedAt: now },
      }),
      this.prisma.refreshSession.updateMany({
        where: { userId: payload.sub, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    return { message: "Mật khẩu đã được cập nhật" };
  }

  private async issueSession(
    user: User,
    client: ClientInfo,
    familyId: string = randomUUID(),
  ) {
    const secret = randomUUID() + randomUUID();
    const refreshSecret =
      process.env.JWT_REFRESH_SECRET ?? "development-refresh-secret-change-me";
    const session = await this.prisma.refreshSession.create({
      data: {
        userId: user.id,
        familyId,
        secretHash: await argon2.hash(`${secret}:${refreshSecret}`),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        userAgent: client.userAgent,
        ipAddress: client.ipAddress,
      },
    });
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      type: "access",
    });
    return {
      accessToken,
      refreshToken: `${session.id}.${secret}`,
      user: this.publicUser(user),
    };
  }

  async refresh(rawToken: string | undefined, client: ClientInfo) {
    if (!rawToken)
      throw new UnauthorizedException({
        code: "REFRESH_TOKEN_MISSING",
        message: "Phiên đăng nhập không tồn tại",
      });
    const [id, secret] = rawToken.split(".", 2);
    if (!id || !secret)
      throw new UnauthorizedException({
        code: "REFRESH_TOKEN_INVALID",
        message: "Phiên đăng nhập không hợp lệ",
      });
    const session = await this.prisma.refreshSession.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!session)
      throw new UnauthorizedException({
        code: "REFRESH_TOKEN_INVALID",
        message: "Phiên đăng nhập không hợp lệ",
      });
    if (session.revokedAt) {
      await this.prisma.refreshSession.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException({
        code: "REFRESH_TOKEN_REUSED",
        message: "Phiên đăng nhập đã bị thu hồi",
      });
    }
    const refreshSecret =
      process.env.JWT_REFRESH_SECRET ?? "development-refresh-secret-change-me";
    if (
      session.expiresAt <= new Date() ||
      !(await argon2.verify(session.secretHash, `${secret}:${refreshSecret}`))
    )
      throw new UnauthorizedException({
        code: "REFRESH_TOKEN_INVALID",
        message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn",
      });
    await this.prisma.refreshSession.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    return this.issueSession(session.user, client, session.familyId);
  }

  async logout(rawToken: string | undefined) {
    const id = rawToken?.split(".", 1)[0];
    if (id)
      await this.prisma.refreshSession.updateMany({
        where: { id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    return { message: "Đã đăng xuất" };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return { ...this.publicUser(user), memberships: [] };
  }
}
