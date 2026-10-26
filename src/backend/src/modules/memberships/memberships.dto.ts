import { IsInt, IsOptional, Max, Min } from "class-validator";

export class CreateInvitationDto {
  @IsOptional() @IsInt() @Min(1) @Max(30) expiresInDays?: number;
  @IsOptional() @IsInt() @Min(1) @Max(1000) maxUses?: number | null;
}
