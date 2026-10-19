import {
  Gender,
  DatePrecision,
  MarriageStatus,
  ParentKind,
} from "@prisma/client";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from "class-validator";

export class CreateTreeDto {
  @IsString() @IsNotEmpty() @MaxLength(200) name!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string | null;
  @IsOptional()
  @IsUrl({ require_protocol: true })
  coverUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(500) originPlace?: string | null;
}

export class UpdateTreeDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string | null;
  @IsOptional()
  @IsUrl({ require_protocol: true })
  coverUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(500) originPlace?: string | null;
}

export class UpdatePersonDto {
  @IsOptional() @IsString() @MaxLength(200) fullName?: string;
  @IsOptional() @IsString() @MaxLength(200) preferredName?: string | null;
  @IsOptional() @IsArray() @IsString({ each: true }) aliases?: string[];
  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @IsISO8601() birthDate?: string | null;
  @IsOptional()
  @IsEnum(DatePrecision)
  birthDatePrecision?: DatePrecision | null;
  @IsOptional() @IsString() birthPlace?: string | null;
  @IsOptional() @IsISO8601() deathDate?: string | null;
  @IsOptional()
  @IsEnum(DatePrecision)
  deathDatePrecision?: DatePrecision | null;
  @IsOptional() @IsString() deathPlace?: string | null;
  @IsOptional() @IsBoolean() isDeceased?: boolean;
  @IsOptional() @IsString() hometown?: string | null;
  @IsOptional() @IsString() currentResidence?: string | null;
  @IsOptional() @IsString() nationality?: string | null;
  @IsOptional() @IsString() ethnicity?: string | null;
  @IsOptional() @IsString() religion?: string | null;
  @IsOptional() @IsString() occupation?: string | null;
  @IsOptional() @IsString() title?: string | null;
  @IsOptional() @IsString() maidenName?: string | null;
  @IsOptional() @IsString() education?: string | null;
  @IsOptional() @IsString() employer?: string | null;
  @IsOptional() @IsString() phone?: string | null;
  @IsOptional() @IsString() email?: string | null;
  @IsOptional() @IsString() address?: string | null;
  @IsOptional() @IsString() bloodType?: string | null;
  @IsOptional() @IsString() identificationCode?: string | null;
  @IsOptional() @IsObject() socialLinks?: Record<string, string> | null;
  @IsOptional() @IsString() biography?: string | null;
  @IsOptional() @IsString() notes?: string | null;
  @IsOptional() @IsString() burialPlace?: string | null;
  @IsOptional() @IsUrl({ require_protocol: true }) avatarUrl?: string | null;
  @IsOptional() @IsString() avatarPublicId?: string | null;
}

export class CreatePersonDto extends UpdatePersonDto {
  @IsString() @IsNotEmpty() @MaxLength(200) declare fullName: string;
}

export class CreateRelationshipDto {
  @IsIn(["PARENT_CHILD", "SPOUSE"])
  type!: "PARENT_CHILD" | "SPOUSE";
  @IsString() @IsNotEmpty() fromPersonId!: string;
  @IsString() @IsNotEmpty() toPersonId!: string;
  @IsOptional() @IsEnum(ParentKind) parentKind?: ParentKind | null;
  @IsOptional() @IsInt() @Min(1) birthOrder?: number | null;
  @IsOptional()
  @IsEnum(MarriageStatus)
  marriageStatus?: MarriageStatus | null;
  @IsOptional() @IsInt() @Min(1) marriageOrder?: number | null;
  @IsOptional() @IsISO8601() startedAt?: string | null;
  @IsOptional()
  @IsEnum(DatePrecision)
  startedAtPrecision?: DatePrecision | null;
  @IsOptional() @IsISO8601() endedAt?: string | null;
  @IsOptional()
  @IsEnum(DatePrecision)
  endedAtPrecision?: DatePrecision | null;
}

export class UpdateRelationshipDto {
  @IsOptional()
  @IsIn(["PARENT_CHILD", "SPOUSE"])
  type?: "PARENT_CHILD" | "SPOUSE";
  @IsOptional() @IsString() @IsNotEmpty() fromPersonId?: string;
  @IsOptional() @IsString() @IsNotEmpty() toPersonId?: string;
  @IsOptional() @IsEnum(ParentKind) parentKind?: ParentKind | null;
  @IsOptional() @IsInt() @Min(1) birthOrder?: number | null;
  @IsOptional()
  @IsEnum(MarriageStatus)
  marriageStatus?: MarriageStatus | null;
  @IsOptional() @IsInt() @Min(1) marriageOrder?: number | null;
  @IsOptional() @IsISO8601() startedAt?: string | null;
  @IsOptional()
  @IsEnum(DatePrecision)
  startedAtPrecision?: DatePrecision | null;
  @IsOptional() @IsISO8601() endedAt?: string | null;
  @IsOptional()
  @IsEnum(DatePrecision)
  endedAtPrecision?: DatePrecision | null;
}

export class AddPersonImageDto {
  @IsUrl({ require_protocol: true }) url!: string;
  @IsString() publicId!: string;
  @IsOptional() @IsString() caption?: string | null;
  @IsOptional() @IsISO8601() takenAt?: string | null;
  @IsOptional() @IsInt() @Min(0) width?: number | null;
  @IsOptional() @IsInt() @Min(0) height?: number | null;
  @IsOptional() @IsString() format?: string | null;
  @IsOptional() @IsInt() @Min(0) bytes?: number | null;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
