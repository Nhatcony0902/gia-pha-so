import { EventCategory, EventMediaType } from "@prisma/client";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from "class-validator";

export class CreateEventDto {
  @IsString() @IsNotEmpty() @MaxLength(200) title!: string;
  @IsEnum(EventCategory) category!: EventCategory;
  @IsOptional() @IsString() @MaxLength(5000) description?: string | null;
  @IsOptional() @IsString() @MaxLength(500) location?: string | null;
  @IsISO8601() startAt!: string;
  @IsOptional() @IsISO8601() endAt?: string | null;
}

export class UpdateEventDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) title?: string;
  @IsOptional() @IsEnum(EventCategory) category?: EventCategory;
  @IsOptional() @IsString() @MaxLength(5000) description?: string | null;
  @IsOptional() @IsString() @MaxLength(500) location?: string | null;
  @IsOptional() @IsISO8601() startAt?: string;
  @IsOptional() @IsISO8601() endAt?: string | null;
}

export class AddEventGuestsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsEmail({}, { each: true })
  emails!: string[];
}

export class AddEventMediaDto {
  @IsUrl({ require_protocol: true }) url!: string;
  @IsString() @IsNotEmpty() publicId!: string;
  @IsEnum(EventMediaType) type!: EventMediaType;
  @IsString() @IsNotEmpty() @MaxLength(500) originalName!: string;
  @IsOptional() @IsString() @MaxLength(200) mimeType?: string | null;
  @IsOptional() @IsString() @MaxLength(50) format?: string | null;
  @IsOptional() @IsInt() @Min(0) bytes?: number | null;
  @IsOptional() @IsInt() @Min(0) width?: number | null;
  @IsOptional() @IsInt() @Min(0) height?: number | null;
}
