import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    HeadBucketCommand,
    CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});

const BUCKET = process.env.S3_BUCKET_NAME || "hopin-project-documents";

export class S3Service {
    async ensureBucketExists(): Promise<void> {
        try {
            await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
        } catch (error: any) {
            if (error.$metadata?.httpStatusCode === 404 || error.name === 'NotFound' || error.name === 'NoSuchBucket') {
                await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
                console.log(`[S3] Created bucket: ${BUCKET}`);
            } else {
                throw error;
            }
        }
    }

    async upload(key: string, body: Buffer, contentType: string): Promise<void> {
        await s3.send(
            new PutObjectCommand({
                Bucket: BUCKET,
                Key: key,
                Body: body,
                ContentType: contentType,
            }),
        );
    }

    async delete(key: string): Promise<void> {
        await s3.send(
            new DeleteObjectCommand({
                Bucket: BUCKET,
                Key: key,
            }),
        );
    }

    async getSignedDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: BUCKET,
            Key: key,
        });
        return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
    }
}
