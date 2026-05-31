import sql from "@/app/api/utils/sql";
import { ensureAppUser } from "@/app/api/utils/appUser";
import { generateJsonWithAI } from "@/app/api/utils/aiJson";
import { auth } from "@/auth";

const tailoredSchema = {
  name: "tailored_cv",
  schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      professional_summary: { type: "string" },
      prioritized_skills: { type: "array", items: { type: "string" } },
      experience_bullets: { type: "array", items: { type: "string" } },
      projects_to_highlight: { type: "array", items: { type: "string" } },
      keywords_used: { type: "array", items: { type: "string" } },
      warnings: { type: "array", items: { type: "string" } },
    },
    required: [
      "title",
      "professional_summary",
      "prioritized_skills",
      "experience_bullets",
      "projects_to_highlight",
      "keywords_used",
      "warnings",
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
      system: `Kamu adalah CV Tailor Agent. Buat versi CV yang lebih cocok untuk lowongan, tetapi hanya dari fakta pada CV asli. Jangan menambah skill, sertifikat, pendidikan, pengalaman, atau pencapaian palsu. Jika data kurang, masukkan warning. Output dipakai untuk preview dan nanti bisa di-export.`,
      user: `CV JSON:\n${JSON.stringify(cvRows[0].parsed_json || {})}\n\nJob:\n${JSON.stringify(jobRows[0])}`,
      schema: tailoredSchema,
    });

    const resultJson = JSON.stringify(result);
    const activityDetails = JSON.stringify({ job_id: jobId, cv_id: cvId });

    const title =
      result.title ||
      `${jobRows[0].company || "Company"} ${jobRows[0].title || "Role"} Tailored CV`;
    const rows = await sql`
      INSERT INTO cv_versions (user_id, cv_id, job_id, version_type, title, content_json)
      VALUES (${user.id}, ${cvId}, ${jobId}, 'TAILORED', ${title}, ${resultJson}::jsonb)
      RETURNING *
    `;

    await sql`
      UPDATE applications
      SET status = 'TAILORED_CV_READY', tailored_cv_url = ${rows[0].file_url}, notes = 'Tailored CV preview sudah dibuat'
      WHERE user_id = ${user.id} AND job_id = ${jobId}
    `;

    await sql`
      INSERT INTO activity_logs (user_id, action, details)
      VALUES (${user.id}, 'TAILORED_CV_CREATED', ${activityDetails}::jsonb)
    `;

    return Response.json({ tailoredCv: rows[0], content: result });
  } catch (error) {
    console.error("Tailored CV error:", error);
    return Response.json(
      { error: "Tidak bisa membuat tailored CV" },
      { status: 500 },
    );
  }
}
