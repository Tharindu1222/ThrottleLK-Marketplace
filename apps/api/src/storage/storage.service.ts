import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
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
        forcePathStyle: true,
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

  private rethrowR2(
    err: unknown,
    action: 'upload' | 'delete' | 'download',
  ): never {
    const code =
      err && typeof err === 'object' && 'Code' in err
        ? String((err as { Code?: string }).Code)
        : err && typeof err === 'object' && 'name' in err
          ? String((err as { name?: string }).name)
          : 'UNKNOWN';
    this.logger.error(`R2 ${action} failed (${code})`, err);

    if (code === 'AccessDenied' || code === 'InvalidAccessKeyId') {
      throw new ServiceUnavailableException({
        success: false,
        error: {
          code: 'R2_ACCESS_DENIED',
          message:
            'Cloudflare R2 denied the request. Create an R2 API token with Object Read & Write on this bucket, then update R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET in .env and restart the API.',
        },
      });
    }

    throw new ServiceUnavailableException({
      success: false,
      error: {
        code: 'R2_ERROR',
        message: `Image storage ${action} failed (${code}). Check R2 credentials and bucket name.`,
      },
    });
  }

  async putObject(
    storageKey: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<StoredObject> {
    const { client, bucket, publicUrl } = this.requireR2();
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: storageKey,
          Body: buffer,
          ContentType: contentType,
        }),
      );
    } catch (err) {
      this.rethrowR2(err, 'upload');
    }
    return {
      storageKey,
      publicUrl: `${publicUrl}/${storageKey}`,
    };
  }

  async getObject(
    storageKey: string,
  ): Promise<{ buffer: Buffer; contentType: string | null }> {
    const { client, bucket } = this.requireR2();
    try {
      const out = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: storageKey }),
      );
      const bytes = out.Body
        ? await out.Body.transformToByteArray()
        : new Uint8Array();
      return {
        buffer: Buffer.from(bytes),
        contentType: out.ContentType ?? null,
      };
    } catch (err) {
      this.rethrowR2(err, 'download');
    }
  }

  async deleteObject(storageKey: string): Promise<void> {
    const { client, bucket } = this.requireR2();
    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: storageKey,
        }),
      );
    } catch (err) {
      this.rethrowR2(err, 'delete');
    }
  }
}
