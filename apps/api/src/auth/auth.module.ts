import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { requireJwtSecrets } from '../common/jwt-secrets';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { AuthToken } from './auth-token.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { RefreshSession } from './refresh-session.entity';

@Module({
  imports: [
    UsersModule,
    NotificationsModule,
    PassportModule,
    TypeOrmModule.forFeature([AuthToken, RefreshSession]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: requireJwtSecrets({
          NODE_ENV: config.get<string>('NODE_ENV') ?? process.env.NODE_ENV,
          JWT_ACCESS_SECRET:
            config.get<string>('JWT_ACCESS_SECRET') ??
            process.env.JWT_ACCESS_SECRET,
          JWT_REFRESH_SECRET:
            config.get<string>('JWT_REFRESH_SECRET') ??
            process.env.JWT_REFRESH_SECRET,
        }).access,
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
