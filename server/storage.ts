// Storage abstraction - Cloudflare R2 with AWS SDK
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ENV } from './_core/env';

type StorageConfig = {
  type: 'forge' | 'r2';
  baseUrl?: string;
  apiKey?: string;
  r2Config?: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    publicUrl: string;
  };
};

function getStorageConfig(): StorageConfig {
  // Check for R2 configuration
  const r2AccountId = process.env.R2_ACCOUNT_ID;
  const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
  const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const r2BucketName = process.env.R2_BUCKET_NAME || 'nexora';
  const r2PublicUrl = process.env.R2_PUBLIC_URL || 'https://pub-4bd96393344a84d0ba91e48f7516c6e61.r2.dev';

  if (r2AccountId && r2AccessKeyId && r2SecretAccessKey) {
    return {
      type: 'r2',
      r2Config: {
        accountId: r2AccountId,
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
        bucketName: r2BucketName,
        publicUrl: r2PublicUrl,
      },
    };
  }

  // Fall back to Forge
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage credentials missing. Set either:\n" +
      "  - R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME\n" +
      "  - BUILT_IN_FORGE_API_URL, BUILT_IN_FORGE_API_KEY"
    );
  }

  return {
    type: 'forge',
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey
  };
}

// R2 Upload using AWS SDK S3Client
async function uploadToR2(
  config: NonNullable<StorageConfig['r2Config']>,
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const buffer = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);

  // CONFIGURACIÓN CORRECTA para Cloudflare R2
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  try {
    console.log(`[R2] Uploading to bucket: ${config.bucketName}, key: ${key}`);
    await s3Client.send(command);
    console.log('[R2] Upload successful');

    // URL pública
    const url = `${config.publicUrl}/${key}`;

    return { key, url };
  } catch (error: any) {
    console.error('[R2] Upload error details:', {
      message: error.message,
      code: error.Code,
      statusCode: error.$metadata?.httpStatusCode,
    });
    throw new Error(`R2 upload failed: ${error.message}`);
  }
}

// Forge upload (original implementation)
async function uploadToForge(
  baseUrl: string,
  apiKey: string,
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }

  const url = (await response.json()).url;
  return { key, url };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const config = getStorageConfig();

  console.log(`[Storage] Using ${config.type} storage`);

  if (config.type === 'r2' && config.r2Config) {
    return uploadToR2(config.r2Config, relKey, data, contentType);
  } else if (config.type === 'forge' && config.baseUrl && config.apiKey) {
    return uploadToForge(config.baseUrl, config.apiKey, relKey, data, contentType);
  }

  throw new Error('Invalid storage configuration');
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  const config = getStorageConfig();
  const key = normalizeKey(relKey);

  if (config.type === 'r2' && config.r2Config) {
    const url = `${config.r2Config.publicUrl}/${key}`;
    return { key, url };
  } else if (config.type === 'forge' && config.baseUrl && config.apiKey) {
    return {
      key,
      url: await buildDownloadUrl(config.baseUrl, key, config.apiKey),
    };
  }

  throw new Error('Invalid storage configuration');
}
