import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: this.config.get<number>('SMTP_PORT'),
      secure: false,
    });
    this.from =
      this.config.get<string>('MAIL_FROM') ?? 'no-reply@ecommerce.local';
    this.frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
  }

  private async send(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
    } catch (err) {
      this.logger.error(
        `Failed to send email to ${to}: ${(err as Error).message}`,
      );
    }
  }

  sendVerificationEmail(to: string, token: string) {
    const link = `${this.frontendUrl}/verify-email?token=${token}`;
    return this.send(
      to,
      'Verify your email',
      `<p>Welcome! Please verify your email by clicking the link below:</p><p><a href="${link}">${link}</a></p>`,
    );
  }

  sendPasswordResetEmail(to: string, token: string) {
    const link = `${this.frontendUrl}/reset-password?token=${token}`;
    return this.send(
      to,
      'Reset your password',
      `<p>You requested a password reset. Click the link below to set a new password (expires in 1 hour):</p><p><a href="${link}">${link}</a></p>`,
    );
  }

  sendOrderConfirmationEmail(
    to: string,
    orderNumber: string,
    grandTotal: string,
  ) {
    return this.send(
      to,
      `Order confirmation — ${orderNumber}`,
      `<p>Thanks for your order <strong>${orderNumber}</strong>.</p><p>Total charged: $${grandTotal}</p>`,
    );
  }

  sendOrderStatusEmail(to: string, orderNumber: string, status: string) {
    return this.send(
      to,
      `Order ${orderNumber} update`,
      `<p>Your order <strong>${orderNumber}</strong> status changed to <strong>${status}</strong>.</p>`,
    );
  }
}
