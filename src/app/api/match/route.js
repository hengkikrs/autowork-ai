import sql from "@/app/api/utils/sql";
import { ensureAppUser } from "@/app/api/utils/appUser";
import { generateJsonWithAI } from "@/app/api/utils/aiJson";
import { auth } from "@/auth";

const matchSchema = {
  name: "match_score",
  schema: {
    type: "object",
    properties: {
      match_score: { type: "number" },
      decision: { type: "string", enum: ["APPLY", "REVIEW", "SKIP"] },
      reason: { type: "string" },
      matched_skills: { type: "array", items: { type: "string" } },
      missing_skills: { type: "array", items: { type: "string" } },
      matched_experience: { type: "array", items: { type: "string" } },
      risk_notes: { type: "array", items: { type: "string" } },
      recommended_cv_focus: { type: "array", items: { type: "string" } },
    },
    required: [
      "match_score",
      "decision",
      "reason",
      "matched_skills",
      "missing_skills",
      "matched_experience",
      "risk_notes",
      "recommended_cv_focus",
    ],
    additionalProperties: false,
  },
};

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await ensureAppUser(session);
    const { cvId, jobId } = await request.json();

    if (!cvId || !jobId) {
      return Response.json(
        { error: "CV dan lowongan wajib dipilih" },
        { status: 400 },
      );
    }

    const cvRows = await sql`
      SELECT id, parsed_json, audit_result
      FROM cvs
      WHERE id = ${cvId} AND user_id = ${user.id}
      LIMIT 1
    `;
    const jobRows = await sql`
      SELECT *
      FROM jobs
      WHERE id = ${jobId}
      LIMIT 1
    `;
    const preferenceRows = await sql`
      SELECT *
      FROM job_preferences
      WHERE user_id = ${user.id}
      LIMIT 1
    `;

    if (cvRows.length === 0 || jobRows.length === 0) {
      return Response.json(
        { error: "CV atau lowongan tidak ditemukan" },
        { status: 404 },
      );
    }

    const cv = cvRows[0];
    const job = jobRows[0];
    const preferences = preferenceRows[0] || {};

    const result = await generateJsonWithAI({
      system: `Kamu adalah Match Score Agent AutoWork AI. Bandingkan CV dan lowongan. Gunakan bobot: 35% skill match, 25% experience, 15% education, 10% location/job type, 10% keyword, 5% salary/preference. Guardrails: jika skor <70 jangan APPLY. Jika skill utama tidak ada, decision REVIEW. Jika blacklist, scam, lokasi/gaji tidak sesuai, REVIEW atau SKIP. Jangan mengarang skill atau pengalaman.`,
      user: `CV JSON:\n${JSON.stringify(cv.parsed_json || {})}\n\nAudit:\n${JSON.stringify(cv.audit_result || {})}\n\nJob:\n${JSON.stringify(job)}\n\nPreferences:\n${JSON.stringify(preferences)}`,
      schema: matchSchema,
    });

    const safeScore = Math.max(
      0,
      Math.min(100, Math.round(result.match_score || 0)),
    );
    let safeDecision = result.decision || "REVIEW";
    if (safeScore < 70 && safeDecision === "APPLY") {
      safeDecision = "REVIEW";
    }

    const resultJson = JSON.stringify(result);
    const activityDetails = JSON.stringify({
      job_id: jobId,
      cv_id: cvId,
      score: safeScore,
      decision: safeDecision,
    });

    const rows = await sql`
      INSERT INTO match_results (user_id, cv_id, job_id, match_score, decision, reason, details)
      VALUES (${user.id}, ${cvId}, ${jobId}, ${safeScore}, ${safeDecision}, ${result.reason || ""}, ${resultJson}::jsonb)
      ON CONFLICT (user_id, cv_id, job_id)
      DO UPDATE SET
        match_score = EXCLUDED.match_score,
        decision = EXCLUDED.decision,
        reason = EXCLUDED.reason,
        details = EXCLUDED.details,
        created_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    await sql`
      INSERT INTO applications (user_id, job_id, cv_id, status, match_score, match_details, notes)
      VALUES (${user.id}, ${jobId}, ${cvId}, 'MATCHED', ${safeScore}, ${resultJson}::jsonb, ${result.reason || ""})
      ON CONFLICT DO NOTHING
    `;

    await sql`
      INSERT INTO activity_logs (user_id, action, details)
      VALUES (${user.id}, 'JOB_MATCHED', ${activityDetails}::jsonb)
    `;

    return Response.json({
      match: rows[0],
      result: { ...result, match_score: safeScore, decision: safeDecision },
    });
  } catch (error) {
    console.error("Match score error:", error);
    return Response.json(
      { error: "Tidak bisa menghitung match score" },
      { status: 500 },
    );
  }
}
