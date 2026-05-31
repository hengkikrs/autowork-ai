import sql from "@/app/api/utils/sql";
import { ensureAppUser } from "@/app/api/utils/appUser";
import { generateJsonWithAI } from "@/app/api/utils/aiJson";
import { auth } from "@/auth";

const jobSchema = {
  name: "job_parser",
  schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      company: { type: "string" },
      location: { type: "string" },
      salary: { type: "string" },
      job_type: { type: "string" },
      source: { type: "string" },
      job_url: { type: "string" },
      description: { type: "string" },
      requirements: { type: "array", items: { type: "string" } },
      responsibilities: { type: "array", items: { type: "string" } },
      hard_skills: { type: "array", items: { type: "string" } },
      soft_skills: { type: "array", items: { type: "string" } },
      tools: { type: "array", items: { type: "string" } },
      education_requirement: { type: "string" },
      experience_requirement: { type: "string" },
      deadline: { type: "string" },
      summary: { type: "string" },
      risk_notes: { type: "array", items: { type: "string" } },
    },
    required: [
      "title",
      "company",
      "location",
      "salary",
      "job_type",
      "source",
      "job_url",
      "description",
      "requirements",
      "responsibilities",
      "hard_skills",
      "soft_skills",
      "tools",
      "education_requirement",
      "experience_requirement",
      "deadline",
      "summary",
      "risk_notes",
    ],
    additionalProperties: false,
  },
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await ensureAppUser(session);
    const jobs = await sql`
      SELECT j.*, mr.match_score, mr.decision, mr.reason, a.status AS application_status
      FROM jobs j
      LEFT JOIN match_results mr ON mr.job_id = j.id AND mr.user_id = ${user.id}
      LEFT JOIN applications a ON a.job_id = j.id AND a.user_id = ${user.id}
      ORDER BY j.created_at DESC
      LIMIT 100
    `;

    return Response.json({ jobs });
  } catch (error) {
    console.error("Jobs fetch error:", error);
    return Response.json(
      { error: "Tidak bisa mengambil daftar lowongan" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await ensureAppUser(session);
    const body = await request.json();
    const rawDescription = body.description || body.rawDescription || "";

    if (!rawDescription.trim()) {
      return Response.json(
        { error: "Job description wajib diisi" },
        { status: 400 },
      );
    }

    const parsed = await generateJsonWithAI({
      system: `Kamu adalah Job Parser Agent untuk AutoWork AI. Ekstrak lowongan kerja menjadi JSON terstruktur. Jangan mengarang data. Jika data tidak ada, isi string kosong atau array kosong. Wajib mendeteksi scam/risk notes jika ada. Jangan scraping atau bypass aturan portal kerja.`,
      user: `Job URL: ${body.jobUrl || ""}\nSource: ${body.source || "Manual Input"}\n\nJob Description:\n${rawDescription}`,
      schema: jobSchema,
    });

    const jobUrl = parsed.job_url || body.jobUrl || `manual-${Date.now()}`;
    const requirementsJson = JSON.stringify(parsed.requirements || []);
    const responsibilitiesJson = JSON.stringify(parsed.responsibilities || []);
    const hardSkillsJson = JSON.stringify(parsed.hard_skills || []);
    const softSkillsJson = JSON.stringify(parsed.soft_skills || []);
    const toolsJson = JSON.stringify(parsed.tools || []);

    const rows = await sql`
      INSERT INTO jobs (
        title, company, location, salary, job_type, source, job_url, description,
        requirements, responsibilities, hard_skills, soft_skills, tools,
        education_requirement, experience_requirement, deadline
      )
      VALUES (
        ${parsed.title || "Untitled Role"}, ${parsed.company || "Unknown Company"},
        ${parsed.location || ""}, ${parsed.salary || ""}, ${parsed.job_type || ""},
        ${parsed.source || body.source || "Manual Input"}, ${jobUrl}, ${parsed.description || rawDescription},
        ${requirementsJson}::jsonb, ${responsibilitiesJson}::jsonb, ${hardSkillsJson}::jsonb,
        ${softSkillsJson}::jsonb, ${toolsJson}::jsonb, ${parsed.education_requirement || ""},
        ${parsed.experience_requirement || ""}, ${parsed.deadline || ""}
      )
      ON CONFLICT (job_url)
      DO UPDATE SET
        title = EXCLUDED.title,
        company = EXCLUDED.company,
        location = EXCLUDED.location,
        salary = EXCLUDED.salary,
        job_type = EXCLUDED.job_type,
        source = EXCLUDED.source,
        description = EXCLUDED.description,
        requirements = EXCLUDED.requirements,
        responsibilities = EXCLUDED.responsibilities,
        hard_skills = EXCLUDED.hard_skills,
        soft_skills = EXCLUDED.soft_skills,
        tools = EXCLUDED.tools,
        education_requirement = EXCLUDED.education_requirement,
        experience_requirement = EXCLUDED.experience_requirement,
        deadline = EXCLUDED.deadline
      RETURNING *
    `;

    await sql`
      INSERT INTO activity_logs (user_id, action, details)
      VALUES (${user.id}, 'JOB_MANUAL_ADDED', ${JSON.stringify({ job_id: rows[0].id, title: rows[0].title })}::jsonb)
    `;

    return Response.json({
      job: {
        ...rows[0],
        summary: parsed.summary,
        risk_notes: parsed.risk_notes,
      },
    });
  } catch (error) {
    console.error("Job create error:", error);
    return Response.json(
      { error: "Tidak bisa memproses lowongan" },
      { status: 500 },
    );
  }
}
