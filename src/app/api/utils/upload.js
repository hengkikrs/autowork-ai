import sql from "./sql";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

let tableReadyPromise = null;

async function ensureUploadTable() {
  if (tableReadyPromise) {
    return tableReadyPromise;
  }

  tableReadyPromise = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS cv_upload_files (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_auth_user_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
        file_name text NOT NULL,
        mime_type text NOT NULL,
        size_bytes integer NOT NULL,
        data bytea NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`ALTER TABLE cv_upload_files ENABLE ROW LEVEL SECURITY`;
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'cv_upload_files'
            AND policyname = 'deny_public_access'
        ) THEN
          CREATE POLICY deny_public_access
          ON cv_upload_files
          FOR ALL
          USING (false)
          WITH CHECK (false);
        END IF;
      END $$
    `;
  })();

  try {
    await tableReadyPromise;
  } catch (error) {
    tableReadyPromise = null;
    throw error;
  }
}

function sanitizeFileName(fileName) {
  const safeName = (fileName || "cv-upload")
    .replace(/[^a-zA-Z0-9._ -]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  return safeName || "cv-upload";
}

async function getBufferFromInput({ url, buffer, base64 }) {
  if (buffer) {
    return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  }

  if (base64) {
    const cleanBase64 = String(base64).includes(",")
      ? String(base64).split(",").pop()
      : String(base64);
    return Buffer.from(cleanBase64, "base64");
  }

  if (url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch remote upload URL: ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  throw new Error("No upload content was provided.");
}

async function upload({ url, buffer, base64, fileName, mimeType, prefix }) {
  const uploadBuffer = await getBufferFromInput({ url, buffer, base64 });

  if (uploadBuffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("File too large.");
  }

  if (!prefix) {
    throw new Error("Upload owner is required.");
  }

  await ensureUploadTable();

  const rows = await sql`
    INSERT INTO cv_upload_files (
      owner_auth_user_id,
      file_name,
      mime_type,
      size_bytes,
      data
    )
    VALUES (
      ${prefix},
      ${sanitizeFileName(fileName)},
      ${mimeType || "application/octet-stream"},
      ${uploadBuffer.byteLength},
      ${uploadBuffer}
    )
    RETURNING id, file_name, mime_type, size_bytes
  `;

  const file = rows[0];
  return {
    url: `/api/upload/${file.id}`,
    mimeType: file.mime_type || null,
    path: file.id,
    size: file.size_bytes,
  };
}

export { upload, ensureUploadTable };
export default upload;
