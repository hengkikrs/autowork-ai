import sql from "@/app/api/utils/sql";
import { ensureAppUser } from "@/app/api/utils/appUser";
import { auth } from "@/auth";
import { getAnythingHeaders } from "@/app/api/utils/headers";

function extractBasicInfo(rawText) {
  const text = rawText || "";
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null;
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() || null;
  const name = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.includes("@") && line.length <= 80);

  return { name: name || null, email, phone };
}

function buildFallbackResult(rawText, reason) {
  const info = extractBasicInfo(rawText);
  const hasUserText =
    rawText &&
    !rawText.startsWith("File uploaded:") &&
    rawText.trim().length >= 80;

  return {
    parsed_json: {
      personal_info: {
        name: info.name,
        email: info.email,
        phone: info.phone,
        location: null,
        linkedin: null,
        portfolio: null,
      },
      summary: hasUserText ? rawText.slice(0, 500) : "",
      education: [],
      experience: [],
      skills: {
        technical_skills: [],
        tools: [],
        soft_skills: [],
        languages: [],
      },
      projects: [],
      certifications: [],
      achievements: [],
    },
    audit_result: {
      ats_score: hasUserText ? 35 : 0,
      issues: [
        reason,
        "AI belum bisa membaca detail CV secara lengkap dari file ini.",
      ],
      strengths: hasUserText ? ["Teks CV sudah tersimpan untuk dianalisis."] : [],
      recommendations: [
        "Paste isi CV pada form upload agar analisis ATS lebih akurat.",
        "Pastikan CV memuat ringkasan, pengalaman, skill, pendidikan, dan kontak.",
      ],
      missing_sections: hasUserText ? [] : ["CV text"],
      improved_summary: "",
      improved_experience_bullets: [],
    },
  };
}

function parseAiResult(aiData) {
  const content = aiData?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("AI response did not include message content.");
  }

  return typeof content === "string" ? JSON.parse(content) : content;
}

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

    let result;
    let usedFallback = false;

    try {
      // Call AI to parse and audit. If the integration is temporarily down,
      // the CV record still gets a usable fallback audit instead of failing upload.
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

      if (!aiResponse.ok) {
        throw new Error(`AI integration failed with status ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      result = parseAiResult(aiData);
    } catch (aiError) {
      console.warn("CV AI Processing Fallback:", aiError);
      usedFallback = true;
      result = buildFallbackResult(
        rawText,
        "Layanan AI sedang gagal merespons, jadi CV disimpan dengan audit awal.",
      );
    }

    // Update the database
    const parsedJson = JSON.stringify(result.parsed_json || {});
    const auditJson = JSON.stringify(result.audit_result || {});

    await sql`
      UPDATE cvs 
      SET parsed_json = ${parsedJson}::jsonb, 
          audit_result = ${auditJson}::jsonb 
      WHERE id = ${cvId} AND user_id = ${user.id}
    `;

    return Response.json({ success: true, usedFallback, ...result });
  } catch (error) {
    console.error("CV Processing Error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
