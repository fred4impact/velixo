import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import type { AuthenticatedUser } from './types/authenticated-user.type';

const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly saltRounds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {
    this.saltRounds = Number(this.config.get('BCRYPT_SALT_ROUNDS') ?? 10);
  }

  private signAccessToken(user: AuthenticatedUser) {
    return this.jwt.sign({ sub: user.id, email: user.email, role: user.role }, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN'),
    } as JwtSignOptions);
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const raw = crypto.randomBytes(48).toString('hex');
    const tokenHash = await bcrypt.hash(raw, this.saltRounds);
    const expiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
    const expiresAt = new Date(Date.now() + parseDurationMs(expiresIn));

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return `${userId}.${raw}`;
  }

  private async rotateRefreshToken(oldTokenId: string, userId: string) {
    await this.prisma.refreshToken.update({
      where: { id: oldTokenId },
      data: { revokedAt: new Date() },
    });
    return this.issueRefreshToken(userId);
  }

  private async issueTokenPair(user: AuthenticatedUser) {
    const accessToken = this.signAccessToken(user);
    const refreshToken = await this.issueRefreshToken(user.id);
    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    await this.sendVerificationEmail(user.id, user.email);

    const authUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    return this.issueTokenPair(authUser);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const authUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    return this.issueTokenPair(authUser);
  }

  async logout(refreshToken: string) {
    const parsed = this.parseRefreshToken(refreshToken);
    if (!parsed) return;
    const candidates = await this.prisma.refreshToken.findMany({
      where: {
        userId: parsed.userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    for (const candidate of candidates) {
      if (await bcrypt.compare(parsed.raw, candidate.tokenHash)) {
        await this.prisma.refreshToken.update({
          where: { id: candidate.id },
          data: { revokedAt: new Date() },
        });
        return;
      }
    }
  }

  async refresh(refreshToken: string) {
    const parsed = this.parseRefreshToken(refreshToken);
    if (!parsed) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const candidates = await this.prisma.refreshToken.findMany({
      where: {
        userId: parsed.userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    let matched: (typeof candidates)[number] | undefined;
    for (const candidate of candidates) {
      if (await bcrypt.compare(parsed.raw, candidate.tokenHash)) {
        matched = candidate;
        break;
      }
    }
    if (!matched) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: parsed.userId },
    });
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const newRefreshToken = await this.rotateRefreshToken(matched.id, user.id);
    const authUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    return {
      accessToken: this.signAccessToken(authUser),
      refreshToken: newRefreshToken,
    };
  }

  private parseRefreshToken(
    token: string,
  ): { userId: string; raw: string } | null {
    const idx = token.indexOf('.');
    if (idx === -1) return null;
    return { userId: token.slice(0, idx), raw: token.slice(idx + 1) };
  }

  private async sendVerificationEmail(userId: string, email: string) {
    const raw = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(raw, this.saltRounds);
    await this.prisma.verificationToken.create({
      data: {
        userId,
        tokenHash,
        type: 'EMAIL_VERIFY',
        expiresAt: new Date(Date.now() + EMAIL_VERIFY_TTL_MS),
      },
    });
    await this.mail.sendVerificationEmail(email, `${userId}.${raw}`);
  }

  async resendVerificationEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerifiedAt) return;
    await this.sendVerificationEmail(user.id, user.email);
  }

  async verifyEmail(token: string) {
    const parsed = this.parseRefreshToken(token);
    if (!parsed) throw new BadRequestException('Invalid verification token');

    const candidates = await this.prisma.verificationToken.findMany({
      where: {
        userId: parsed.userId,
        type: 'EMAIL_VERIFY',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    const matched = await this.findMatchingToken(candidates, parsed.raw);
    if (!matched)
      throw new BadRequestException('Invalid or expired verification token');

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: parsed.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.verificationToken.update({
        where: { id: matched.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return; // do not leak account existence

    const raw = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(raw, this.saltRounds);
    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        type: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    });
    await this.mail.sendPasswordResetEmail(user.email, `${user.id}.${raw}`);
  }

  async resetPassword(dto: ResetPasswordDto) {
    const parsed = this.parseRefreshToken(dto.token);
    if (!parsed) throw new BadRequestException('Invalid reset token');

    const candidates = await this.prisma.verificationToken.findMany({
      where: {
        userId: parsed.userId,
        type: 'PASSWORD_RESET',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    const matched = await this.findMatchingToken(candidates, parsed.raw);
    if (!matched)
      throw new BadRequestException('Invalid or expired reset token');

    const passwordHash = await bcrypt.hash(dto.newPassword, this.saltRounds);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: parsed.userId },
        data: { passwordHash },
      }),
      this.prisma.verificationToken.update({
        where: { id: matched.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: parsed.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(dto.newPassword, this.saltRounds);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  private async findMatchingToken<T extends { id: string; tokenHash: string }>(
    candidates: T[],
    raw: string,
  ): Promise<T | undefined> {
    for (const candidate of candidates) {
      if (await bcrypt.compare(raw, candidate.tokenHash)) {
        return candidate;
      }
    }
    return undefined;
  }
}

function parseDurationMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]!;
  return value * unitMs;
}
