import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

export interface AccessPayload {
  sub: string;
  email: string;
  type: "access";
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey:
        process.env.JWT_ACCESS_SECRET ?? "development-access-secret-change-me",
    });
  }

  validate(payload: AccessPayload) {
    if (payload.type !== "access") throw new UnauthorizedException();
    return { userId: payload.sub, email: payload.email };
  }
}
