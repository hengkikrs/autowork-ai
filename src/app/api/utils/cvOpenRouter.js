import { generateOpenRouterJson } from "./openRouter";

const TARGET_ATS_SCORE = 87;

const cvSchema = {
  name: "autowork_cv_ats_review",
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
            required: ["name", "email", "phone", "location", "linkedin", "portfolio"],
            additionalProperties: false,
          },
          summary: { type: "string" },
          education: { type: "array", items: { type: "string" } },
          experience: { type: "array", items: { type: "string" } },
          skills: {
            type: "object",
            properties: {
              technical_skills: { type: "array", items: { type: "string" } },
              tools: { type: "array", items: { type: "string" } },
              soft_skills: { type: "array", items: { type: "string" } },
              languages: { type: "array", items: { type: "string" } },
            },
            required: ["technical_skills", "tools", "soft_skills", "languages"],
            additionalProperties: false,
          },
          projects: { type: "array", items: { type: "string" } },
          certifications: { type: "array", items: { type: "string" } },
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
          original_ats_score: { type: "number" },
          optimized_ats_score: { type: "number" },
          target_ats_score: { type: "number" },
          optimized_by_ai: { type: "boolean" },
          needs_user_text: { type: "boolean" },
          confidence: { type: "number" },
          source_text_quality: { type: "string" },
          score_breakdown: {
            type: "object",
            properties: {
              contact: { type: "number" },
              structure: { type: "number" },
              keywords: { type: "number" },
              experience: { type: "number" },
              metrics: { type: "number" },
              clarity: { type: "number" },
            },
            required: ["contact", "structure", "keywords", "experience", "metrics", "clarity"],
            additionalProperties: false,
          },
          issues: { type: "array", items: { type: "string" } },
          strengths: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } },
          missing_sections: { type: "array", items: { type: "string" } },
          rewrite_strategy: { type: "array", items: { type: "string" } },
          improved_summary: { type: "string" },
          improved_experience_bullets: { type: "array", items: { type: "string" } },
        },
        required: [
          "ats_score",
          "original_ats_score",
          "optimized_ats_score",
          "target_ats_score",
          "optimized_by_ai",
          "needs_user_text",
          "confidence",
          "source_text_quality",
          "score_breakdown",
          "issues",
          "strengths",
          "recommendations",
          "missing_sections",
          "rewrite_strategy",
          "improved_summary",
          "improved_experience_bullets",
        ],
        additionalProperties: false,
      },
      improved_cv_text: { type: "string" },
    },
    required: ["parsed_json", "audit_result", "improved_cv_text"],
    additionalProperties: false,
  },
};

function clampScore(value) {
  const score = Math.round(Number(value) || 0);
  return Math.max(0, Math.min(100, score));
}

function cleanText(value) {
  return String(value || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function isHeading(line) {
  const value = line.trim();
  return (
    /^[A-Z][A-Z0-9 /&.-]{3,}$/.test(value) ||
    /^(Professional Summary|Summary|Core Skills|Skills|Professional Experience|Experience|Projects|Education|Certifications|Achievements|Kontak|Ringkasan|Pengalaman|Pendidikan|Keahlian)$/i.test(value)
  );
}

export function buildCvDocHtml(cvText) {
  const lines = cleanText(cvText).split("\n").map((line) => line.trim());
  const body = [];
  let listOpen = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) {
      if (listOpen) {
        body.push("</ul>");
        listOpen = false;
      }
      continue;
    }

    if (index === 0) {
      body.push(`<h1>${escapeHtml(line)}</h1>`);
      continue;
    }

    if (isHeading(line)) {
      if (listOpen) {
        body.push("</ul>");
        listOpen = false;
      }
      body.push(`<h2>${escapeHtml(line)}</h2>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      if (!listOpen) {
        body.push("<ul>");
        listOpen = true;
      }
      body.push(`<li>${escapeHtml(line.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }

    if (listOpen) {
      body.push("</ul>");
      listOpen = false;
    }
    body.push(`<p>${escapeHtml(line)}</p>`);
  }

  if (listOpen) body.push("</ul>");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>AutoWork AI ATS CV</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; line-height: 1.45; max-width: 760px; }
    h1 { font-size: 26px; margin-bottom: 4px; }
    h2 { font-size: 14px; margin-top: 18px; padding-bottom: 4px; border-bottom: 1px solid #d1d5db; letter-spacing: 0.04em; text-transform: uppercase; }
    p { margin: 6px 0; }
    ul { margin: 6px 0 0 20px; padding: 0; }
    li { margin-bottom: 5px; }
  </style>
</head>
<body>${body.join("\n")}</body>
</html>`;
}

function normalizeAiResult(result, metadata) {
  const audit = result.audit_result || {};
  const originalScore = clampScore(audit.original_ats_score ?? audit.ats_score);
  const optimizedScore = clampScore(audit.optimized_ats_score ?? audit.ats_score);
  const improvedText = cleanText(result.improved_cv_text);
  const canUseRewrite = improvedText.length > 200 && !audit.needs_user_text;
  const finalScore = canUseRewrite ? optimizedScore : originalScore;

  return {
    parsed_json: result.parsed_json || {},
    audit_result: {
      ...audit,
      ats_score: finalScore,
      original_ats_score: originalScore,
      optimized_ats_score: optimizedScore,
      target_ats_score: TARGET_ATS_SCORE,
      optimized_by_ai: canUseRewrite && originalScore < TARGET_ATS_SCORE,
      needs_user_text: Boolean(audit.needs_user_text),
      confidence: Math.max(0, Math.min(1, Number(audit.confidence) || 0)),
      ai_provider: "openrouter",
      ai_model: metadata.model,
      ai_usage: metadata.usage,
    },
    improvedText,
    improvedHtml: canUseRewrite ? buildCvDocHtml(improvedText) : "",
    needsOptimization: canUseRewrite && originalScore < TARGET_ATS_SCORE,
  };
}

export async function processCvWithOpenRouter({ rawText, fileName, userId }) {
  const sourceText = cleanText(rawText);

  const { json, model, usage } = await generateOpenRouterJson({
    schema: cvSchema,
    userId,
    maxTokens: 6500,
    temperature: 0.15,
    messages: [
      {
        role: "system",
        content: `You are AutoWork AI, a strict ATS auditor and professional CV writer.

Rules:
- Use only facts present in the CV text. Do not invent companies, dates, certifications, degrees, achievements, tools, or metrics.
- If the CV text is only a filename/upload placeholder or too incomplete to rewrite safely, set needs_user_text=true, keep the score low, and leave improved_cv_text empty.
- Score must be realistic. Do not force 87. The target is 87, but only give 87+ if the rewritten CV would plausibly pass ATS based on available facts.
- If original_ats_score is below 87 and enough facts exist, rewrite the CV into a complete ATS-friendly version with clear headings, contact, summary, skills, experience bullets, projects/education if available, and no tables.
- Return Indonesian if the CV is mostly Indonesian; otherwise use English.
- improved_cv_text must be a clean plain-text CV ready to convert to Word, not commentary.`,
      },
      {
        role: "user",
        content: `Uploaded file name: ${fileName || "unknown"}

CV TEXT:
${sourceText}`,
      },
    ],
  });

  return normalizeAiResult(json, { model, usage });
}
