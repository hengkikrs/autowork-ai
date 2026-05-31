import sql from "@/app/api/utils/sql";
import { ensureAppUser } from "@/app/api/utils/appUser";
import { auth } from "@/auth";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await ensureAppUser(session);
    const { jobId, cvId } = await request.json();

    if (!jobId || !cvId) {
      return Response.json(
        { error: "Lowongan dan CV wajib dipilih" },
        { status: 400 },
      );
    }

    const matchRows = await sql`
      SELECT match_score, decision, details
      FROM match_results
      WHERE user_id = ${user.id} AND job_id = ${jobId} AND cv_id = ${cvId}
      LIMIT 1
    `;
    const match = matchRows[0];
    const status =
      match?.match_score >= 70
        ? "WAITING_USER_APPROVAL"
        : "NEEDS_MANUAL_ACTION";
    const notes =
      match?.match_score >= 70
        ? "Dokumen siap direview. Manual Assist aktif, user tetap submit sendiri."
        : "Match score belum cukup tinggi. Review manual disarankan.";

    const matchDetailsJson = JSON.stringify(match?.details || {});
    const activityDetails = JSON.stringify({
      job_id: jobId,
      cv_id: cvId,
      status,
    });

    const rows = await sql`
      INSERT INTO applications (user_id, job_id, cv_id, status, match_score, match_details, notes)
      VALUES (${user.id}, ${jobId}, ${cvId}, ${status}, ${match?.match_score || 0}, ${matchDetailsJson}::jsonb, ${notes})
      RETURNING *
    `;

    await sql`
      INSERT INTO activity_logs (user_id, action, details)
      VALUES (${user.id}, 'APPLICATION_PREPARED', ${activityDetails}::jsonb)
    `;

    return Response.json({ application: rows[0] });
  } catch (error) {
    console.error("Prepare apply error:", error);
    return Response.json(
      { error: "Tidak bisa menyiapkan lamaran" },
      { status: 500 },
    );
  }
}
