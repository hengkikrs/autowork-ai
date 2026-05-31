import { auth } from "@/auth";
import upload from "@/app/api/utils/upload";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function isAllowedMimeType(mimeType) {
  return [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ].includes(mimeType);
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return Response.json({ error: "File is required" }, { status: 400 });
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        return Response.json({ error: "File too large" }, { status: 413 });
      }

      if (!isAllowedMimeType(file.type)) {
        return Response.json({ error: "Unsupported file type" }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const result = await upload({
        buffer: Buffer.from(arrayBuffer),
      });

      return Response.json({
        url: result.url,
        mimeType: result.mimeType || file.type,
      });
    }

    if (contentType.includes("application/json")) {
      const body = await request.json();
      const result = await upload({
        url: body.url,
        base64: body.base64,
      });

      return Response.json(result);
    }

    const arrayBuffer = await request.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_UPLOAD_BYTES) {
      return Response.json({ error: "File too large" }, { status: 413 });
    }

    const result = await upload({
      buffer: Buffer.from(arrayBuffer),
    });

    return Response.json(result);
  } catch (error) {
    console.error("Upload Error:", error);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
