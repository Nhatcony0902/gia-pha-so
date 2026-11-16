import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

/**
 * Lỗi của body-parser (body quá lớn, JSON hỏng) không phải HttpException nên trước đây thành 500.
 * Đổi sang 413/400 để client hiện đúng thông báo.
 */
export function fromBodyParserError(exception: unknown): unknown {
  const error = exception as { type?: unknown; status?: unknown };
  if (exception instanceof HttpException || typeof error?.type !== "string")
    return exception;
  if (error.type === "entity.too.large")
    return new HttpException(
      { code: "PAYLOAD_TOO_LARGE", message: "Dữ liệu gửi lên quá lớn" },
      HttpStatus.PAYLOAD_TOO_LARGE,
    );
  if (
    typeof error.status === "number" &&
    error.status >= 400 &&
    error.status < 500
  )
    return new HttpException(
      { code: "VALIDATION_ERROR", message: "Dữ liệu gửi lên không hợp lệ" },
      error.status,
    );
  return exception;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(rawException: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const exception = fromBodyParserError(rawException);
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body =
      exception instanceof HttpException ? exception.getResponse() : null;
    const value =
      typeof body === "object" && body ? (body as Record<string, unknown>) : {};
    // 429 của ThrottlerGuard không có mã riêng. 429 có mã (ví dụ AI_QUOTA_EXCEEDED) giữ nguyên thông báo.
    const isRateLimited =
      status === HttpStatus.TOO_MANY_REQUESTS && typeof value.code !== "string";
    const rawMessage = isRateLimited
      ? "Bạn thao tác quá nhanh. Vui lòng chờ tối đa 60 giây rồi thử lại"
      : (value.message ??
        (exception instanceof HttpException
          ? exception.message
          : "Đã có lỗi xảy ra"));
    const messages = Array.isArray(rawMessage)
      ? rawMessage.map(String)
      : [String(rawMessage)];
    const code = isRateLimited
      ? "RATE_LIMITED"
      : typeof value.code === "string"
        ? value.code
        : status === 400
          ? "VALIDATION_ERROR"
          : `HTTP_${status}`;

    const context = `${request.method} ${request.originalUrl || request.url} -> ${status} ${code}`;
    if (status >= 500) {
      const stack =
        exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(
        `${context}: ${exception instanceof Error ? exception.message : "Unknown error"}`,
        stack,
      );
    } else {
      this.logger.warn(`${context}: ${messages.join("; ")}`);
    }

    if (isRateLimited) response.setHeader("Retry-After", "60");
    response.status(status).json({
      error: {
        code,
        message: messages[0] ?? "Đã có lỗi xảy ra",
        ...(messages.length > 1
          ? { details: messages.map((message) => ({ field: "", message })) }
          : {}),
      },
    });
  }
}
