import sql from "@/app/api/utils/sql";
import { ensureAppUser } from "@/app/api/utils/appUser";
import { auth } from "@/auth";
import { getAnythingHeaders } from "@/app/api/utils/headers";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cvId } = await request.json();
    if (!cvId) {
      return Response.json({ error: "CV ID is required" }, { status: 400 });
    }

    const user = await ensureAppUser(session);

    // Fetch the CV text
    const rows =
      await sql`SELECT raw_text FROM cvs WHERE id = ${cvId} AND user_id = ${user.id}`;
    if (rows.length === 0) {
      return Response.json({ error: "CV not found" }, { status: 404 });
    }

    const rawText = rows[0].raw_text;

    // Call AI to Parse and Audit
    const aiResponse = await fetch(
      `${process.env.NEXT_PUBLIC_CREATE_APP_URL}/integrations/google-gemini-2-5-pro/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAnythingHeaders()
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are a professional HR Expert and ATS Auditor.
            Task 1: Parse the CV text into structured JSON.
            Task 2: Audit the CV for ATS compatibility, structure, keywords, and relevance.
            
            Return ONLY a JSON object with this structure:
            {
              "parsed_json": {
                "personal_info": { "name": "", "email": "", "phone": "", "location": "", "linkedin": "", "portfolio": "" },
                "summary": "",
                "education": [],
                "experience": [],
                "skills": { "technical_skills": [], "tools": [], "soft_skills": [], "languages": [] },
                "projects": [],
                "certifications": [],
                "achievements": []
              },
              "audit_result": {
                "ats_score": 0,
                "issues": [],
                "strengths": [],
                "recommendations": [],
                "missing_sections": [],
                "improved_summary": "",
                "improved_experience_bullets": []
              }
            }
            Do not invent experience or skills. If data is missing, use null or empty array.`,
            },
            {
              role: "user",
              content: `CV Text: \n\n ${rawText}`,
            },
          ],
          json_schema: {
            name: "cv_processing",
            schema: {
              type: "object",
              properties: {
                parsed_json: {
                  type: "object",
                  properties: {
                    personal_info: {
                      type: "object",
                      properties: {
                        name: { type: ["string", "null"] },
                        email: { type: ["string", "null"] },
                        phone: { type: ["string", "null"] },
                        location: { type: ["string", "null"] },
                        linkedin: { type: ["string", "null"] },
                        portfolio: { type: ["string", "null"] },
                      },
                      required: [
                        "name",
                        "email",
                        "phone",
                        "location",
                        "linkedin",
                        "portfolio",
                      ],
                      additionalProperties: false,
                    },
                    summary: { type: "string" },
                    education: { type: "array", items: { type: "string" } },
                    experience: { type: "array", items: { type: "string" } },
                    skills: {
                      type: "object",
                      properties: {
                        technical_skills: {
                          type: "array",
                          items: { type: "string" },
                        },
                        tools: { type: "array", items: { type: "string" } },
                        soft_skills: {
                          type: "array",
                          items: { type: "string" },
                        },
                        languages: { type: "array", items: { type: "string" } },
                      },
                      required: [
                        "technical_skills",
                        "tools",
                        "soft_skills",
                        "languages",
                      ],
                      additionalProperties: false,
                    },
                    projects: { type: "array", items: { type: "string" } },
                    certifications: {
                      type: "array",
                      items: { type: "string" },
                    },
                    achievements: { type: "array", items: { type: "string" } },
                  },
                  required: [
                    "personal_info",
                    "summary",
                    "education",
                    "experience",
                    "skills",
                    "projects",
                    "certifications",
                    "achievements",
                  ],
                  additionalProperties: false,
                },
                audit_result: {
                  type: "object",
                  properties: {
                    ats_score: { type: "number" },
                    issues: { type: "array", items: { type: "string" } },
                    strengths: { type: "array", items: { type: "string" } },
                    recommendations: {
                      type: "array",
                      items: { type: "string" },
                    },
                    missing_sections: {
                      type: "array",
                      items: { type: "string" },
                    },
                    improved_summary: { type: "string" },
                    improved_experience_bullets: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                  required: [
                    "ats_score",
                    "issues",
                    "strengths",
                    "recommendations",
                    "missing_sections",
                    "improved_summary",
                    "improved_experience_bullets",
                  ],
                  additionalProperties: false,
                },
              },
              required: ["parsed_json", "audit_result"],
              additionalProperties: false,
            },
          },
        }),
      },
    );

    const aiData = await aiResponse.json();
    const result = JSON.parse(aiData.choices[0].message.content);

    // Update the database
    const parsedJson = JSON.stringify(result.parsed_json || {});
    const auditJson = JSON.stringify(result.audit_result || {});

    await sql`
      UPDATE cvs 
      SET parsed_json = ${parsedJson}::jsonb, 
          audit_result = ${auditJson}::jsonb 
      WHERE id = ${cvId} AND user_id = ${user.id}
    `;

    return Response.json({ success: true, ...result });
  } catch (error) {
    console.error("CV Processing Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
