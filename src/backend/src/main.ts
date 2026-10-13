import "reflect-metadata";
import "dotenv/config";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import cookieParser from "cookie-parser";
import { ApiExceptionFilter } from "./common/http-exception.filter.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new ApiExceptionFilter());

  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);
  console.log(`Family Tree API running at http://localhost:${port}/api`);
}

void bootstrap();
