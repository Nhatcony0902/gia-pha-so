import type { TreeRole } from "@family-tree/shared-types";
import {
  IsEmail,
  IsIn,
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

export class UpdateMemberRoleDto {
  @IsIn(["ADMIN", "EDITOR", "VIEWER"], { message: "Vai trò không hợp lệ" })
  role!: TreeRole;
}
