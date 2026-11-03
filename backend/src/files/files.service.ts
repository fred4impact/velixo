import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { randomUUID } from 'crypto';

@Injectable()
export class FilesService implements OnModuleInit {
  private readonly client: Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('MINIO_BUCKET')!;
    this.publicUrl = this.config
      .get<string>('MINIO_PUBLIC_URL')!
      .replace(/\/$/, '');
    this.client = new Client({
      endPoint: this.config.get<string>('MINIO_ENDPOINT')!,
      port: Number(this.config.get('MINIO_PORT')),
      useSSL: this.config.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.config.get<string>('MINIO_ACCESS_KEY')!,
      secretKey: this.config.get<string>('MINIO_SECRET_KEY')!,
    });
  }

  async onModuleInit() {
    const exists = await this.client
      .bucketExists(this.bucket)
      .catch(() => false);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
      await this.client.setBucketPolicy(
        this.bucket,
        JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucket}/*`],
            },
          ],
        }),
      );
    }
  }

  async uploadProductImage(file: Express.Multer.File): Promise<string> {
    return this.upload('products', file);
  }

  async uploadBrandLogo(file: Express.Multer.File): Promise<string> {
    return this.upload('brands', file);
  }

  private async upload(
    prefix: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const ext = file.originalname.split('.').pop();
    const objectName = `${prefix}/${randomUUID()}.${ext}`;
    await this.client.putObject(
      this.bucket,
      objectName,
      file.buffer,
      file.size,
      {
        'Content-Type': file.mimetype,
      },
    );
    return `${this.publicUrl}/${this.bucket}/${objectName}`;
  }
}
