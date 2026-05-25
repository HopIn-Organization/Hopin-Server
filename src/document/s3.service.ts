import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});

const BUCKET = process.env.S3_BUCKET_NAME || "hopin-project-documents";

export class S3Service {
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
