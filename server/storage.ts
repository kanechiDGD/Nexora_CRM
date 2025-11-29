// Storage abstraction supporting both Forge and Cloudflare R2
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
  };
};

function getStorageConfig(): StorageConfig {
  // Check for R2 configuration first
  const r2AccountId = process.env.R2_ACCOUNT_ID;
  const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
  const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const r2BucketName = process.env.R2_BUCKET_NAME || 'nexora';

  if (r2AccountId && r2AccessKeyId && r2SecretAccessKey) {
    return {
      type: 'r2',
      r2Config: {
        accountId: r2AccountId,
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
        bucketName: r2BucketName,
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

// R2 Simple Upload using fetch (no AWS SDK)
async function uploadToR2(
  config: NonNullable<StorageConfig['r2Config']>,
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const buffer = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);

  // R2 endpoint for direct upload
  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucketName}/${key}`;

  // Create AWS Signature V4 for authorization
  const authHeader = await createR2AuthHeader(
    config,
    'PUT',
    `/${config.bucketName}/${key}`,
    contentType,
    buffer
  );

  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      'Authorization': authHeader,
      'Content-Type': contentType,
      'Content-Length': buffer.length.toString(),
    },
    body: buffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `R2 upload failed (${response.status}): ${errorText}`
    );
  }

  // Use the public dev URL
  const url = `https://pub-4bd96393344a84d0ba91e48f7516c6e61.r2.dev/${key}`;

  return { key, url };
}

// Simple AWS Signature V4 for R2
async function createR2AuthHeader(
  config: NonNullable<StorageConfig['r2Config']>,
  method: string,
  path: string,
  contentType: string,
  body: Buffer
): Promise<string> {
  const crypto = await import('crypto');

  const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = timestamp.slice(0, 8);
  const region = 'auto';
  const service = 's3';

  // Create canonical request
  const payloadHash = crypto.createHash('sha256').update(body).digest('hex');
  const canonicalHeaders = `content-type:${contentType}\nhost:${config.accountId}.r2.cloudflarestorage.com\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${timestamp}\n`;
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = `${method}\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  // Create string to sign
  const credentialScope = `${date}/${region}/${service}/aws4_request`;
  const canonicalRequestHash = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
  const stringToSign = `AWS4-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${canonicalRequestHash}`;

  // Calculate signature
  const kDate = crypto.createHmac('sha256', `AWS4${config.secretAccessKey}`).update(date).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  // Return authorization header value
  return `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
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
    const url = `https://pub-4bd96393344a84d0ba91e48f7516c6e61.r2.dev/${key}`;
    return { key, url };
  } else if (config.type === 'forge' && config.baseUrl && config.apiKey) {
    return {
      key,
      url: await buildDownloadUrl(config.baseUrl, key, config.apiKey),
    };
  }

  throw new Error('Invalid storage configuration');
}
