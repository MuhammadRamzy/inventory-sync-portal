import { NextResponse } from "next/server";
import { r2Client } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function POST(request: Request) {
  try {
    const { filename, contentType } = await request.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: "Filename and contentType are required" }, { status: 400 });
    }

    const bucketName = process.env.R2_BUCKET_NAME || "wetta-images";
    
    // Generate a unique key for the file
    const uniqueKey = `${Date.now()}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueKey,
      ContentType: contentType,
    });

    // Create a pre-signed URL valid for 5 minutes
    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });

    // Assuming the user configures a custom domain for R2 like 'images.wetta.com' or standard public R2 domain
    const r2PublicDomain = process.env.R2_PUBLIC_DOMAIN;
    const publicUrl = r2PublicDomain ? `https://${r2PublicDomain}/${uniqueKey}` : undefined;

    return NextResponse.json({ signedUrl, key: uniqueKey, publicUrl });
  } catch (error) {
    console.error("Failed to generate pre-signed URL:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
