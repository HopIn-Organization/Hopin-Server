import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  CreateBucketCommandInput,
} from "@aws-sdk/client-s3";
import { S3Service } from "../document/s3.service";
import { SEED_DOCUMENTS } from "./seed-document-definitions";

const BUCKET = process.env.S3_BUCKET_NAME || "hopin-project-documents";
const REGION = process.env.AWS_REGION || "us-east-1";

const s3Client = new S3Client({
  region: REGION,
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

async function ensureBucketExists(): Promise<void> {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET }));
    console.log(`  bucket "${BUCKET}" already exists`);
  } catch (err: any) {
    // HeadBucket throws 404 (NotFound) or NoSuchBucket when the bucket is missing
    const code = err?.name ?? err?.Code ?? "";
    if (err?.$metadata?.httpStatusCode === 404 || code === "NoSuchBucket" || code === "NotFound") {
      const input: CreateBucketCommandInput = { Bucket: BUCKET };
      // us-east-1 must NOT include a LocationConstraint; all other regions must
      if (REGION !== "us-east-1") {
        input.CreateBucketConfiguration = { LocationConstraint: REGION as any };
      }
      await s3Client.send(new CreateBucketCommand(input));
      console.log(`  bucket "${BUCKET}" created`);
    } else {
      throw err;
    }
  }
}

export async function runS3Seed(): Promise<void> {
  const s3 = new S3Service();

  console.log("Ensuring S3 bucket exists...");
  await ensureBucketExists();

  console.log(`Uploading ${SEED_DOCUMENTS.length} seed documents to S3...`);
  for (const doc of SEED_DOCUMENTS) {
    await s3.upload(doc.s3Key, doc.content, doc.mimeType);
    console.log(`  uploaded  ${doc.s3Key}  (${doc.content.byteLength} bytes)`);
  }

  console.log("S3 seed completed successfully.");
}

if (require.main === module) {
  runS3Seed().catch((err) => {
    console.error("Error during S3 seed:", err);
    process.exit(1);
  });
}
