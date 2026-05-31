import sql from "@/app/api/utils/sql";
import { ensureAppUser } from "@/app/api/utils/appUser";
import { generateJsonWithAI } from "@/app/api/utils/aiJson";
import { auth } from "@/auth";

const letterSchema = {
  name: "cover_letter",
  schema: {
    type: "object",
    properties: {
      language: { type: "string" },
      subject: { type: "string" },
      content: { type: "string" },
      warnings: { type: "array", items: { type: "string" } },
    },
    required: ["language", "subject", "content", "warnings"],
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

    const cvRows =
      await sql`SELECT * FROM cvs WHERE id = ${cvId} AND user_id = ${user.id} LIMIT 1`;
    const jobRows = await sql`SELECT * FROM jobs WHERE id = ${jobId} LIMIT 1`;

    if (cvRows.length === 0 || jobRows.length === 0) {
      return Response.json(
        { error: "CV atau lowongan tidak ditemukan" },
        { status: 404 },
      );
    }

    const result = await generateJsonWithAI({
      system: `Kamu adalah Cover Letter Agent AutoWork AI. Buat cover letter singkat, profesional, dan natural berdasarkan CV dan job description. Ikuti bahasa lowongan: jika lowongan bahasa Inggris, tulis Inggris; jika Indonesia, tulis Indonesia. Jangan mengarang pengalaman. Jangan terlalu lebay.`,
      user: `CV JSON:\n${JSON.stringify(cvRows[0].parsed_json || {})}\n\nJob:\n${JSON.stringify(jobRows[0])}`,
      schema: letterSchema,
    });

    const activityDetails = JSON.stringify({ job_id: jobId, cv_id: cvId });

    const rows = await sql`
      INSERT INTO cover_letters (user_id, cv_id, job_id, content)
      VALUES (${user.id}, ${cvId}, ${jobId}, ${result.content || ""})
      ON CONFLICT (user_id, cv_id, job_id)
      DO UPDATE SET content = EXCLUDED.content, created_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    await sql`
      UPDATE applications
      SET status = 'COVER_LETTER_READY', cover_letter_url = ${rows[0].file_url}, notes = 'Cover letter sudah dibuat'
      WHERE user_id = ${user.id} AND job_id = ${jobId}
    `;

    await sql`
      INSERT INTO activity_logs (user_id, action, details)
      VALUES (${user.id}, 'COVER_LETTER_CREATED', ${activityDetails}::jsonb)
    `;

    return Response.json({ coverLetter: rows[0], content: result });
  } catch (error) {
    console.error("Cover letter error:", error);
    return Response.json(
      { error: "Tidak bisa membuat cover letter" },
      { status: 500 },
    );
  }
}
