import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BadRequestException, HttpException } from "@nestjs/common";
import { fromBodyParserError } from "./http-exception.filter.js";

/** Giống lỗi http-errors mà body-parser ném ra. */
const parserError = (type: string, status: number) =>
  Object.assign(new Error(type), { type, status, expose: true });

describe("fromBodyParserError", () => {
  it("body quá lớn thành 413 PAYLOAD_TOO_LARGE", () => {
    const error = fromBodyParserError(parserError("entity.too.large", 413));
    assert.ok(error instanceof HttpException);
    assert.equal(error.getStatus(), 413);
    assert.equal(
      (error.getResponse() as { code: string }).code,
      "PAYLOAD_TOO_LARGE",
    );
  });

  it("JSON hỏng thành 400 VALIDATION_ERROR", () => {
    const error = fromBodyParserError(parserError("entity.parse.failed", 400));
    assert.ok(error instanceof HttpException);
    assert.equal(error.getStatus(), 400);
  });

  it("giữ nguyên HttpException và lỗi thường", () => {
    const http = new BadRequestException("x");
    assert.equal(fromBodyParserError(http), http);
    const plain = new Error("boom");
    assert.equal(fromBodyParserError(plain), plain);
    const server = parserError("stream.encoding.set", 500);
    assert.equal(fromBodyParserError(server), server);
  });
});
