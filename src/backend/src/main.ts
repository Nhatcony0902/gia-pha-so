import "reflect-metadata";
import "dotenv/config";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import cookieParser from "cookie-parser";
import { json, type NextFunction, type Request, type Response } from "express";
import { CHAT_BODY_LIMIT } from "./modules/ai/chat-image.js";
import { ApiExceptionFilter } from "./common/http-exception.filter.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  });
  app.use(cookieParser());
  // Route chat nhận ảnh base64 (LMS-019) nên cần body lớn hơn mặc định 100 KB. Đăng ký trước
  // body parser mặc định của Nest; request đã parse thì parser mặc định bỏ qua.
  // Phải bọc trong hàm có tên khác: Nest thấy middleware tên "jsonParser" thì tưởng đã có
  // parser JSON và không đăng ký parser mặc định nữa, mọi route khác sẽ mất body.
  const chatJsonParser = json({ limit: CHAT_BODY_LIMIT });
  app.use(
    "/api/trees/:treeId/chat",
    function chatBodyParser(req: Request, res: Response, next: NextFunction) {
      chatJsonParser(req, res, next);
    },
  );
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new ApiExceptionFilter());

  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);
  console.log(`Family Tree API running at http://localhost:${port}/api`);
}

void bootstrap();
