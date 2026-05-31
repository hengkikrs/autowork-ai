import sql from "@/app/api/utils/sql";
import { ensureAppUser } from "@/app/api/utils/appUser";
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
    const cvs = await sql`
      SELECT id, file_url, parsed_json, audit_result, created_at 
      FROM cvs 
      WHERE user_id = ${user.id} 
      ORDER BY created_at DESC
    `;

    return Response.json({ cvs });
  } catch (error) {
    console.error("CV Fetch Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
