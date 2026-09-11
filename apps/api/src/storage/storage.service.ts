import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

export type StoredObject = {
  storageKey: string;
  publicUrl: string;
};

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string | null;
  private readonly publicUrl: string | null;

  constructor(private readonly config: ConfigService) {
    const accountId = this.read('R2_ACCOUNT_ID');
    const accessKeyId = this.read('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.read('R2_SECRET_ACCESS_KEY');
    const bucket = this.read('R2_BUCKET');
    const publicUrl = this.read('R2_PUBLIC_URL');

    if (accountId && accessKeyId && secretAccessKey && bucket && publicUrl) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.bucket = bucket;
      this.publicUrl = publicUrl.replace(/\/$/, '');
      this.logger.log(`R2 storage ready (bucket=${bucket})`);
    } else {
      this.client = null;
      this.bucket = null;
      this.publicUrl = null;
      this.logger.error(
        'R2 is required: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL',
      );
    }
  }

  private read(key: string): string | undefined {
    const value = this.config.get<string>(key) ?? process.env[key];
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  private requireR2() {
    if (!this.client || !this.bucket || !this.publicUrl) {
      throw new ServiceUnavailableException({
        success: false,
        error: {
          code: 'R2_NOT_CONFIGURED',
          message:
            'Image storage requires Cloudflare R2. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, and R2_PUBLIC_URL.',
        },
      });
    }
    return {
      client: this.client,
      bucket: this.bucket,
      publicUrl: this.publicUrl,
    };
  }

  async putObject(
    storageKey: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<StoredObject> {
    const { client, bucket, publicUrl } = this.requireR2();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return {
      storageKey,
      publicUrl: `${publicUrl}/${storageKey}`,
    };
  }

  async deleteObject(storageKey: string): Promise<void> {
    const { client, bucket } = this.requireR2();
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: storageKey,
      }),
    );
  }
}
