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
    const rows = await sql`
      SELECT a.*, j.title, j.company, j.source, j.job_url
      FROM applications a
      LEFT JOIN jobs j ON j.id = a.job_id
      WHERE a.user_id = ${user.id}
        AND a.created_at >= date_trunc('week', CURRENT_TIMESTAMP)
      ORDER BY a.created_at DESC
    `;

    const summary = {
      found: rows.length,
      matched: rows.filter((item) => item.status === "MATCHED").length,
      tailored: rows.filter((item) => item.status === "TAILORED_CV_READY")
        .length,
      cover_letters: rows.filter((item) => item.status === "COVER_LETTER_READY")
        .length,
      applied: rows.filter((item) => item.status === "APPLIED").length,
      pending: rows.filter((item) => item.status === "WAITING_USER_APPROVAL")
        .length,
      failed: rows.filter((item) => item.status === "FAILED").length,
    };

    return Response.json({ summary, applications: rows });
  } catch (error) {
    console.error("Weekly report error:", error);
    return Response.json(
      { error: "Tidak bisa membuat laporan mingguan" },
      { status: 500 },
    );
  }
}
