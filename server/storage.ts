// Storage abstraction - R2 PUBLIC uploads (NO authentication)
import { ENV } from './_core/env';

type StorageConfig = {
  type: 'forge' | 'r2';
  baseUrl?: string;
  apiKey?: string;
  r2PublicUrl?: string;
};

function getStorageConfig(): StorageConfig {
  // Check for R2 public URL
  const r2PublicUrl = process.env.R2_PUBLIC_URL;

  if (r2PublicUrl) {
    return {
      type: 'r2',
      r2PublicUrl,
    };
  }

  // Fall back to Forge
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage credentials missing. Set either:\n" +
      "  - R2_PUBLIC_URL\n" +
      "  - BUILT_IN_FORGE_API_URL, BUILT_IN_FORGE_API_KEY"
    );
  }

  return {
    type: 'forge',
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey
  };
}

// R2 Public Upload - NO authentication needed
async function uploadToR2Public(
  publicUrl: string,
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const buffer = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);

  // Direct PUT to public R2 URL
  const uploadUrl = `${publicUrl}/${key}`;

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Content-Length': buffer.length.toString(),
    },
    body: buffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `R2 public upload failed (${response.status}): ${errorText}`
    );
  }

  // Return the public URL
  const url = uploadUrl;

  return { key, url };
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

  if (config.type === 'r2' && config.r2PublicUrl) {
    return uploadToR2Public(config.r2PublicUrl, relKey, data, contentType);
  } else if (config.type === 'forge' && config.baseUrl && config.apiKey) {
    return uploadToForge(config.baseUrl, config.apiKey, relKey, data, contentType);
  }

  throw new Error('Invalid storage configuration');
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  const config = getStorageConfig();
  const key = normalizeKey(relKey);

  if (config.type === 'r2' && config.r2PublicUrl) {
    const url = `${config.r2PublicUrl}/${key}`;
    return { key, url };
  } else if (config.type === 'forge' && config.baseUrl && config.apiKey) {
    return {
      key,
      url: await buildDownloadUrl(config.baseUrl, key, config.apiKey),
    };
  }

  throw new Error('Invalid storage configuration');
}
