import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body =
      exception instanceof HttpException ? exception.getResponse() : null;
    const value =
      typeof body === "object" && body ? (body as Record<string, unknown>) : {};
    const isRateLimited = status === HttpStatus.TOO_MANY_REQUESTS;
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
