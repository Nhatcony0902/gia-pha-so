import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service.js";
import {
  EmailDto,
  GoogleDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyCodeDto,
} from "./auth.dto.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";

type AuthenticatedRequest = Request & {
  user: { userId: string; email: string };
};
const COOKIE_NAME = "family_tree_refresh";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  private client(req: Request) {
    return { userAgent: req.get("user-agent"), ipAddress: req.ip };
  }
  private cookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/api/auth",
      maxAge: 30 * 24 * 60 * 60_000,
    };
  }
  private respondWithSession(
    result: Awaited<ReturnType<AuthService["login"]>>,
    res: Response,
  ) {
    res.cookie(COOKIE_NAME, result.refreshToken, this.cookieOptions());
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post("register")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post("register/resend")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  resend(@Body() dto: EmailDto) {
    return this.auth.resendRegistration(dto.email);
  }

  @Post("register/verify")
  @HttpCode(200)
  async verifyRegistration(
    @Body() dto: VerifyCodeDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respondWithSession(
      await this.auth.verifyRegistration(dto, this.client(req)),
      res,
    );
  }

  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respondWithSession(
      await this.auth.login(dto, this.client(req)),
      res,
    );
  }

  @Post("google")
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async google(
    @Body() dto: GoogleDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respondWithSession(
      await this.auth.googleLogin(dto, this.client(req)),
      res,
    );
  }

  @Post("password-reset/request")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  requestReset(@Body() dto: EmailDto) {
    return this.auth.requestPasswordReset(dto.email);
  }

  @Post("password-reset/verify")
  @HttpCode(200)
  verifyReset(@Body() dto: VerifyCodeDto) {
    return this.auth.verifyPasswordReset(dto);
  }

  @Post("password-reset/confirm")
  @HttpCode(200)
  confirmReset(@Body() dto: ResetPasswordDto) {
    return this.auth.confirmPasswordReset(dto);
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.refresh(
      req.cookies?.[COOKIE_NAME] as string | undefined,
      this.client(req),
    );
    return this.respondWithSession(result, res);
  }

  @Post("logout")
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.logout(
      req.cookies?.[COOKIE_NAME] as string | undefined,
    );
    res.clearCookie(COOKIE_NAME, this.cookieOptions());
    return result;
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@Req() req: AuthenticatedRequest) {
    return this.auth.me(req.user.userId);
  }
}
