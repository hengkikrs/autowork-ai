import sql from "@/app/api/utils/sql";
import { ensureAppUser } from "@/app/api/utils/appUser";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await ensureAppUser(session);
    const applications = await sql`
      SELECT a.*, j.title, j.company, j.location, j.source, j.job_url
      FROM applications a
      LEFT JOIN jobs j ON j.id = a.job_id
      WHERE a.user_id = ${user.id}
      ORDER BY a.created_at DESC
      LIMIT 100
    `;

    return Response.json({ applications });
  } catch (error) {
    console.error("Applications fetch error:", error);
    return Response.json(
      { error: "Tidak bisa mengambil daftar lamaran" },
      { status: 500 },
    );
  }
}
