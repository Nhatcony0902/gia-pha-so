import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class CreateInvitationDto {
  @IsOptional() @IsInt() @Min(1) @Max(30) expiresInDays?: number;
  @IsOptional() @IsInt() @Min(1) @Max(1000) maxUses?: number | null;
  @IsOptional() @IsEmail() @MaxLength(320) email?: string;
  @IsOptional() @IsString() personId?: string | null;
}
