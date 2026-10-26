import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { DatabaseModule } from "./modules/database/database.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { MailModule } from "./modules/mail/mail.module.js";
import { TreesModule } from "./modules/trees/trees.module.js";
import { MembershipsModule } from "./modules/memberships/memberships.module.js";

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    DatabaseModule,
    MailModule,
    AuthModule,
    TreesModule,
    MembershipsModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
