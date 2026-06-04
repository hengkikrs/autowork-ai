import sql from "@/app/api/utils/sql";
import { ensureAppUser } from "@/app/api/utils/appUser";
import { ensureUploadTable } from "@/app/api/utils/upload";
import { auth } from "@/auth";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileUrl, rawText } = await request.json();
    if (!fileUrl) {
      return Response.json({ error: "File URL is required" }, { status: 400 });
    }

    const user = await ensureAppUser(session);

    const result = await sql`
      INSERT INTO cvs (user_id, file_url, raw_text, is_master)
      VALUES (${user.id}, ${fileUrl}, ${rawText}, TRUE)
      RETURNING id, file_url, created_at
    `;

    return Response.json({ cv: result[0] });
  } catch (error) {
    console.error("CV Upload Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await ensureAppUser(session);
    await ensureUploadTable();

    const cvs = await sql`
      SELECT
        c.id,
        c.file_url,
        c.raw_text,
        c.parsed_json,
        c.audit_result,
        c.created_at,
        f.file_name,
        f.mime_type,
        f.size_bytes
      FROM cvs c
      LEFT JOIN cv_upload_files f
        ON c.file_url = '/api/upload/' || f.id::text
       AND f.owner_auth_user_id = ${session.user.id}
      WHERE c.user_id = ${user.id}
      ORDER BY c.created_at DESC
    `;

    return Response.json({ cvs });
  } catch (error) {
    console.error("CV Fetch Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cvId, rawText } = await request.json();
    const cleanRawText = String(rawText || "").trim();

    if (!cvId) {
      return Response.json({ error: "CV ID is required" }, { status: 400 });
    }

    if (!cleanRawText) {
      return Response.json(
        { error: "Isi teks CV tidak boleh kosong" },
        { status: 400 },
      );
    }

    const user = await ensureAppUser(session);
    const rows = await sql`
      UPDATE cvs
      SET raw_text = ${cleanRawText},
          parsed_json = '{}'::jsonb,
          audit_result = '{}'::jsonb
      WHERE id = ${cvId} AND user_id = ${user.id}
      RETURNING id, file_url, raw_text, parsed_json, audit_result, created_at
    `;

    if (rows.length === 0) {
      return Response.json({ error: "CV not found" }, { status: 404 });
    }

    return Response.json({ cv: rows[0] });
  } catch (error) {
    console.error("CV Update Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cvId } = await request.json();
    if (!cvId) {
      return Response.json({ error: "CV ID is required" }, { status: 400 });
    }

    const user = await ensureAppUser(session);
    const rows = await sql`
      DELETE FROM cvs
      WHERE id = ${cvId} AND user_id = ${user.id}
      RETURNING id
    `;

    if (rows.length === 0) {
      return Response.json({ error: "CV not found" }, { status: 404 });
    }

    return Response.json({ success: true, deletedCvId: rows[0].id });
  } catch (error) {
    console.error("CV Delete Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
