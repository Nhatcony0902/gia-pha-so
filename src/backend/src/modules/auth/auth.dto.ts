import {
  IsEmail,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

export class RegisterDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsEmail() email!: string;
  @IsString()
  @Matches(passwordPattern, {
    message: "Mật khẩu phải dài 8-72 ký tự, có chữ và số",
  })
  password!: string;
  @IsString() passwordConfirmation!: string;
}

export class EmailDto {
  @IsEmail() email!: string;
}

export class VerifyCodeDto extends EmailDto {
  @IsString() @Length(6, 6) @Matches(/^\d{6}$/) code!: string;
}

export class LoginDto extends EmailDto {
  @IsString() password!: string;
}

export class GoogleDto {
  @IsString() credential!: string;
}

export class ResetPasswordDto {
  @IsString() resetToken!: string;
  @IsString()
  @Matches(passwordPattern, {
    message: "Mật khẩu phải dài 8-72 ký tự, có chữ và số",
  })
  password!: string;
  @IsString() passwordConfirmation!: string;
}
