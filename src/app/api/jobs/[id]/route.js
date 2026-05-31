import sql from "@/app/api/utils/sql";
import { ensureAppUser } from "@/app/api/utils/appUser";
import { auth } from "@/auth";

export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await ensureAppUser(session);
    const id = Number(params.id);

    const rows = await sql`
      SELECT j.*, mr.id AS match_id, mr.match_score, mr.decision, mr.reason,
             mr.details AS match_details, a.status AS application_status,
             a.cover_letter_url, a.tailored_cv_url, a.notes
      FROM jobs j
      LEFT JOIN match_results mr ON mr.job_id = j.id AND mr.user_id = ${user.id}
      LEFT JOIN applications a ON a.job_id = j.id AND a.user_id = ${user.id}
      WHERE j.id = ${id}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return Response.json(
        { error: "Lowongan tidak ditemukan" },
        { status: 404 },
      );
    }

    return Response.json({ job: rows[0] });
  } catch (error) {
    console.error("Job detail error:", error);
    return Response.json(
      { error: "Tidak bisa mengambil detail lowongan" },
      { status: 500 },
    );
  }
}
