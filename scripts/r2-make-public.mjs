import "dotenv/config";
import { S3Client, ListObjectsV2Command, CopyObjectCommand } from "@aws-sdk/client-s3";

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
} = process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error("[R2] Missing required environment variables.");
  console.error("Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME");
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const encodeKey = (key) => encodeURIComponent(key).replace(/%2F/g, "/");

let total = 0;
let continuationToken = undefined;

try {
  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        ContinuationToken: continuationToken,
      })
    );

    const objects = response.Contents ?? [];
    for (const obj of objects) {
      if (!obj.Key) continue;
      await client.send(
        new CopyObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: obj.Key,
          CopySource: `${R2_BUCKET_NAME}/${encodeKey(obj.Key)}`,
          ACL: "public-read",
          MetadataDirective: "COPY",
        })
      );
      total += 1;
      if (total % 50 === 0) {
        console.log(`[R2] Updated ${total} objects...`);
      }
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  console.log(`[R2] Completed. Updated ${total} objects.`);
} catch (error) {
  console.error("[R2] Failed to update objects:", error);
  process.exit(1);
}
