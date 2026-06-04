import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

function sanitizeDownloadName(fileName) {
  return (fileName || "cv-upload")
    .replace(/[^a-zA-Z0-9._ -]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = params?.id;
    if (!id) {
      return Response.json({ error: "File ID is required" }, { status: 400 });
    }

    const rows = await sql`
      SELECT file_name, mime_type, data
      FROM cv_upload_files
      WHERE id = ${id}
        AND owner_auth_user_id = ${session.user.id}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return Response.json({ error: "File not found" }, { status: 404 });
    }

    const file = rows[0];
    const fileName = sanitizeDownloadName(file.file_name);

    return new Response(file.data, {
      headers: {
        "Content-Type": file.mime_type || "application/octet-stream",
        "Content-Disposition": `inline; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Upload File Fetch Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
