import mammoth from "mammoth";
import sql from "./sql";

function getUploadId(fileUrl) {
  const match = String(fileUrl || "").match(/\/api\/upload\/([0-9a-f-]+)/i);
  return match?.[1] || null;
}

function asBuffer(data) {
  if (!data) return null;
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  return Buffer.from(data);
}

function isDocx(file) {
  const name = String(file?.file_name || "").toLowerCase();
  const mime = String(file?.mime_type || "").toLowerCase();
  return (
    name.endsWith(".docx") ||
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

function isText(file) {
  const name = String(file?.file_name || "").toLowerCase();
  const mime = String(file?.mime_type || "").toLowerCase();
  return name.endsWith(".txt") || mime.startsWith("text/");
}

export function looksLikePlaceholderCvText(text) {
  const value = String(text || "").trim();
  return (
    !value ||
    value.length < 120 ||
    /^file uploaded:/i.test(value)
  );
}

export async function extractTextFromStoredCvFile({ fileUrl, authUserId }) {
  const uploadId = getUploadId(fileUrl);
  if (!uploadId || !authUserId) {
    return { text: "", file: null, extracted: false, reason: "No stored file id" };
  }

  const rows = await sql`
    SELECT file_name, mime_type, data
    FROM cv_upload_files
    WHERE id = ${uploadId}
      AND owner_auth_user_id = ${authUserId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return { text: "", file: null, extracted: false, reason: "Stored file not found" };
  }

  const file = rows[0];
  const buffer = asBuffer(file.data);
  if (!buffer) {
    return { text: "", file, extracted: false, reason: "Stored file is empty" };
  }

  if (isDocx(file)) {
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: String(result.value || "").trim(),
      file,
      extracted: true,
      reason: "DOCX extracted with mammoth",
    };
  }

  if (isText(file)) {
    return {
      text: buffer.toString("utf8").trim(),
      file,
      extracted: true,
      reason: "Text file decoded",
    };
  }

  return {
    text: "",
    file,
    extracted: false,
    reason: "Server extractor supports DOCX and text files",
  };
}
