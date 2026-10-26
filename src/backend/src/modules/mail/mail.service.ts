import { Injectable, Logger } from "@nestjs/common";
import nodemailer from "nodemailer";

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ]!,
  );
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "127.0.0.1",
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: process.env.SMTP_SECURE === "true",
    ...(process.env.SMTP_USER
      ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }
      : {}),
  });

  async sendVerificationCode(input: {
    email: string;
    name?: string | null;
    code: string;
    purpose: "register" | "reset";
  }) {
    const isRegister = input.purpose === "register";
    const title = isRegister
      ? "Xác thực tài khoản Gia Phả Số"
      : "Khôi phục mật khẩu Gia Phả Số";
    const action = isRegister ? "hoàn tất đăng ký" : "đặt lại mật khẩu";
    const greeting = input.name
      ? `Xin chào ${escapeHtml(input.name)},`
      : "Xin chào,";
    const html = `<!doctype html><html><body style="margin:0;background:#f2f5f3;font-family:Arial,sans-serif;color:#18332e"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden"><tr><td style="background:#18332e;padding:26px;color:#fff"><div style="font-size:13px;letter-spacing:.12em;color:#d7a95d;font-weight:700">GIA PHẢ SỐ</div><h1 style="font-size:24px;margin:10px 0 0">${title}</h1></td></tr><tr><td style="padding:30px"><p>${greeting}</p><p>Dùng mã dưới đây để ${action}. Mã có hiệu lực trong 10 phút.</p><div style="margin:26px 0;padding:18px;text-align:center;background:#eef5f1;border:1px solid #b9cec3;border-radius:10px;font-size:32px;letter-spacing:10px;font-weight:700">${input.code}</div><p style="font-size:13px;color:#61736a">Không chia sẻ mã này. Nếu bạn không thực hiện yêu cầu, hãy bỏ qua email.</p></td></tr></table></td></tr></table></body></html>`;
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM ?? "Gia Phả Số <no-reply@example.local>",
      to: input.email,
      subject: title,
      text: `${greeting} Mã xác thực để ${action}: ${input.code}. Mã có hiệu lực trong 10 phút.`,
      html,
    });
    this.logger.log(
      `Sent ${input.purpose} verification email to ${input.email}`,
    );
  }

  async sendTreeInvitation(input: {
    email: string;
    inviterName: string;
    treeName: string;
    personName: string | null;
    url: string;
    expiresAt: Date;
  }) {
    const title = `Lời mời tham gia gia phả ${input.treeName}`;
    const expires = input.expiresAt.toLocaleDateString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });
    const personLine = input.personName
      ? ` Tài khoản của bạn sẽ được gắn với hồ sơ <strong>${escapeHtml(input.personName)}</strong>.`
      : "";
    const html = `<!doctype html><html><body style="margin:0;background:#f2f5f3;font-family:Arial,sans-serif;color:#18332e"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden"><tr><td style="background:#18332e;padding:26px;color:#fff"><div style="font-size:13px;letter-spacing:.12em;color:#d7a95d;font-weight:700">GIA PHẢ SỐ</div><h1 style="font-size:24px;margin:10px 0 0">${escapeHtml(title)}</h1></td></tr><tr><td style="padding:30px"><p>Xin chào,</p><p><strong>${escapeHtml(input.inviterName)}</strong> mời bạn xem gia phả <strong>${escapeHtml(input.treeName)}</strong>.${personLine}</p><p style="margin:28px 0;text-align:center"><a href="${escapeHtml(input.url)}" style="display:inline-block;padding:14px 26px;background:#d7a95d;color:#182b27;border-radius:10px;font-weight:700;text-decoration:none">Tham gia gia phả</a></p><p style="font-size:13px;color:#61736a">Lời mời dành riêng cho ${escapeHtml(input.email)}, có hiệu lực đến ${expires}. Hãy đăng nhập hoặc đăng ký bằng đúng email này. Nếu bạn không quen người mời, hãy bỏ qua email.</p></td></tr></table></td></tr></table></body></html>`;
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM ?? "Gia Phả Số <no-reply@example.local>",
      to: input.email,
      subject: title,
      text: `${input.inviterName} mời bạn xem gia phả ${input.treeName}. Mở link sau để tham gia (hiệu lực đến ${expires}): ${input.url}`,
      html,
    });
    this.logger.log(`Sent tree invitation email to ${input.email}`);
  }
}
