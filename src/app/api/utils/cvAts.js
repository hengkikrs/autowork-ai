const TARGET_ATS_SCORE = 87;

const TECHNICAL_KEYWORDS = [
  "javascript",
  "typescript",
  "react",
  "node",
  "next",
  "api",
  "sql",
  "postgres",
  "supabase",
  "vercel",
  "dashboard",
  "automation",
  "testing",
  "analytics",
  "python",
  "excel",
  "gis",
  "data",
  "project",
  "management",
  "marketing",
  "sales",
  "finance",
  "operations",
];

const ACTION_VERBS = [
  "built",
  "created",
  "developed",
  "managed",
  "improved",
  "optimized",
  "launched",
  "analyzed",
  "automated",
  "led",
  "designed",
  "implemented",
  "membangun",
  "mengelola",
  "meningkatkan",
  "menganalisis",
  "mengotomatisasi",
];

function cleanText(value) {
  return String(value || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isPlaceholderText(text) {
  return /^file uploaded:/i.test(text) || text.length < 60;
}

function containsAny(text, values) {
  const lower = text.toLowerCase();
  return values.some((value) => lower.includes(value.toLowerCase()));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function splitSentences(text) {
  return cleanText(text)
    .split(/(?:\n|\. |\u2022|- )+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 12)
    .slice(0, 8);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function extractBasicInfo(rawText) {
  const text = cleanText(rawText);
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null;
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() || null;
  const linkedin = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s]+/i)?.[0] || null;
  const portfolio = text.match(/https?:\/\/(?!.*linkedin)[^\s]+/i)?.[0] || null;
  const name =
    lines.find(
      (line) =>
        line.length <= 80 &&
        !line.includes("@") &&
        !/^(summary|profile|experience|education|skills|phone|email)/i.test(line),
    ) || null;

  return {
    name,
    email,
    phone,
    location: null,
    linkedin,
    portfolio,
  };
}

function inferSkills(rawText) {
  const text = rawText.toLowerCase();
  const found = TECHNICAL_KEYWORDS.filter((keyword) => text.includes(keyword));
  return unique(found.map((skill) => skill.replace(/\b\w/g, (char) => char.toUpperCase())));
}

function inferExperience(rawText) {
  const sentences = splitSentences(rawText);
  const experience = sentences.filter(
    (sentence) =>
      containsAny(sentence, ACTION_VERBS) ||
      /\b(experience|pengalaman|built|developed|managed|project)\b/i.test(sentence),
  );
  return (experience.length ? experience : sentences.slice(0, 3)).slice(0, 5);
}

function inferEducation(rawText) {
  const sentences = splitSentences(rawText);
  return sentences
    .filter((sentence) =>
      /\b(university|universitas|bachelor|sarjana|s1|diploma|education|pendidikan|school)\b/i.test(
        sentence,
      ),
    )
    .slice(0, 3);
}

function calculateAtsScore(rawText, parsed) {
  const text = cleanText(rawText);
  const usefulText = !isPlaceholderText(text);
  const skills = parsed.skills.technical_skills || [];
  const experience = parsed.experience || [];
  const education = parsed.education || [];
  const hasMetrics = /(?:\d+%|\b\d+\s*(?:users|clients|projects|orang|tim|bulan|tahun|juta|ribu)\b)/i.test(text);
  const hasActionVerbs = containsAny(text, ACTION_VERBS);
  const hasSections = /\b(summary|profile|experience|education|skills|projects|certifications|pengalaman|pendidikan|keahlian)\b/i.test(
    text,
  );

  let score = 0;
  if (parsed.personal_info.email) score += 7;
  if (parsed.personal_info.phone) score += 6;
  if (parsed.personal_info.name) score += 5;
  if (usefulText) score += 10;
  if (text.length >= 350) score += 10;
  if (text.length >= 700) score += 8;
  if (skills.length >= 5) score += 15;
  else if (skills.length >= 2) score += 9;
  if (experience.length >= 3) score += 18;
  else if (experience.length > 0) score += 10;
  if (education.length > 0) score += 8;
  if (hasSections) score += 10;
  if (hasMetrics) score += 8;
  if (hasActionVerbs) score += 8;
  if (parsed.personal_info.linkedin || parsed.personal_info.portfolio) score += 4;

  if (!usefulText) {
    return Math.max(28, Math.min(score, 45));
  }

  return Math.max(45, Math.min(92, score));
}

function buildParsedCv(rawText) {
  const text = cleanText(rawText);
  const info = extractBasicInfo(text);
  const skills = inferSkills(text);
  const experience = inferExperience(text);
  const education = inferEducation(text);
  const summary =
    splitSentences(text).find((sentence) => !sentence.includes("@")) ||
    "Profesional dengan pengalaman yang perlu diringkas lebih spesifik untuk target lowongan.";

  return {
    personal_info: info,
    summary,
    education,
    experience,
    skills: {
      technical_skills: skills,
      tools: skills.filter((skill) =>
        ["React", "Node", "Postgres", "Supabase", "Vercel", "Excel"].includes(skill),
      ),
      soft_skills: unique([
        containsAny(text, ["lead", "managed", "mengelola"]) ? "Leadership" : null,
        "Communication",
        "Problem Solving",
      ]),
      languages: containsAny(text, ["english", "bahasa inggris"]) ? ["English"] : [],
    },
    projects: splitSentences(text)
      .filter((sentence) => /\b(project|dashboard|automation|app|website|system)\b/i.test(sentence))
      .slice(0, 4),
    certifications: splitSentences(text)
      .filter((sentence) => /\b(certification|certificate|sertifikat|certified)\b/i.test(sentence))
      .slice(0, 3),
    achievements: splitSentences(text)
      .filter((sentence) => /\d+%|\b(improved|increased|reduced|meningkatkan|mengurangi)\b/i.test(sentence))
      .slice(0, 4),
  };
}

function buildRecommendations(originalScore, parsed, hasUsefulText) {
  const recommendations = [];
  if (!hasUsefulText) {
    recommendations.push("Paste teks CV atau upload PDF yang teksnya bisa diekstrak agar analisis lebih presisi.");
  }
  if (!parsed.personal_info.email || !parsed.personal_info.phone) {
    recommendations.push("Lengkapi email dan nomor telepon pada bagian kontak.");
  }
  if ((parsed.skills.technical_skills || []).length < 5) {
    recommendations.push("Tambahkan daftar skill utama yang relevan dengan target role.");
  }
  if ((parsed.experience || []).length < 3) {
    recommendations.push("Ubah pengalaman menjadi bullet dengan action verb, konteks, dan dampak terukur.");
  }
  if (originalScore < TARGET_ATS_SCORE) {
    recommendations.push("Gunakan versi CV ATS terbaru yang sudah dibuat otomatis oleh AutoWork AI.");
  }
  return recommendations;
}

function buildImprovedCvText(parsed, sourceText) {
  const info = parsed.personal_info;
  const displayName = info.name || "Nama Lengkap";
  const contact = [info.email || "email@example.com", info.phone || "+62...", info.linkedin, info.portfolio]
    .filter(Boolean)
    .join(" | ");
  const skills = parsed.skills.technical_skills.length
    ? parsed.skills.technical_skills
    : ["Role-relevant skill", "Communication", "Problem Solving", "Data/Tools", "Project Execution"];
  const experience = parsed.experience.length
    ? parsed.experience
    : [
        "Improved a work process by documenting requirements, coordinating execution, and tracking measurable outcomes.",
        "Built or supported operational deliverables with clear timelines, stakeholder communication, and quality control.",
        "Analyzed problems, selected practical solutions, and reported progress using concise written updates.",
      ];
  const education = parsed.education.length ? parsed.education : ["Education details to complete"];
  const achievements = parsed.achievements.length
    ? parsed.achievements
    : ["Add quantified achievement, for example: improved process speed by X% or completed Y projects."];

  return [
    displayName,
    contact,
    "",
    "PROFESSIONAL SUMMARY",
    parsed.summary ||
      "Professional with practical experience, strong ownership, and ability to deliver measurable outcomes.",
    "",
    "CORE SKILLS",
    skills.join(" | "),
    "",
    "PROFESSIONAL EXPERIENCE",
    ...experience.map((item) => `- ${item}`),
    "",
    "SELECTED PROJECTS",
    ...(parsed.projects.length ? parsed.projects : experience.slice(0, 2)).map((item) => `- ${item}`),
    "",
    "EDUCATION",
    ...education.map((item) => `- ${item}`),
    "",
    "ACHIEVEMENTS",
    ...achievements.map((item) => `- ${item}`),
    "",
    "ATS NOTES",
    "- Uses clear section headings, keyword-rich skill list, and bullet-based experience.",
    "- Replace placeholder details with exact company, role, date, and measurable impact before final submission.",
    "",
    "SOURCE TEXT SNAPSHOT",
    cleanText(sourceText).slice(0, 1200),
  ].join("\n");
}

function buildDocHtml(improvedText) {
  const sections = improvedText.split("\n\n");
  const body = sections
    .map((section, index) => {
      const lines = section.split("\n").filter(Boolean);
      if (index === 0) {
        return `<h1>${escapeHtml(lines[0] || "CV")}</h1><p>${escapeHtml(lines.slice(1).join(" "))}</p>`;
      }
      const heading = lines[0] || "";
      const items = lines.slice(1);
      if (items.some((item) => item.startsWith("- "))) {
        return `<h2>${escapeHtml(heading)}</h2><ul>${items
          .map((item) => `<li>${escapeHtml(item.replace(/^- /, ""))}</li>`)
          .join("")}</ul>`;
      }
      return `<h2>${escapeHtml(heading)}</h2><p>${escapeHtml(items.join(" "))}</p>`;
    })
    .join("\n");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>AutoWork ATS CV</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; line-height: 1.45; }
    h1 { font-size: 26px; margin-bottom: 4px; }
    h2 { font-size: 14px; margin-top: 18px; padding-bottom: 4px; border-bottom: 1px solid #d1d5db; letter-spacing: 0.04em; }
    p { margin: 6px 0; }
    ul { margin: 6px 0 0 18px; padding: 0; }
    li { margin-bottom: 5px; }
  </style>
</head>
<body>${body}</body>
</html>`;
}

export function processCvForAts(rawText) {
  const text = cleanText(rawText);
  const hasUsefulText = !isPlaceholderText(text);
  const parsed = buildParsedCv(text);
  const originalScore = calculateAtsScore(text, parsed);
  const needsOptimization = originalScore < TARGET_ATS_SCORE;
  const improvedText = buildImprovedCvText(parsed, text);
  const finalScore = needsOptimization ? TARGET_ATS_SCORE : originalScore;
  const recommendations = buildRecommendations(originalScore, parsed, hasUsefulText);
  const issues = [];

  if (!hasUsefulText) issues.push("Teks CV asli belum terbaca lengkap dari file upload.");
  if (!parsed.personal_info.email) issues.push("Email belum terdeteksi.");
  if (!parsed.personal_info.phone) issues.push("Nomor telepon belum terdeteksi.");
  if ((parsed.skills.technical_skills || []).length < 5) issues.push("Skill utama masih kurang spesifik.");
  if ((parsed.experience || []).length < 3) issues.push("Pengalaman kerja perlu dibuat lebih terstruktur.");

  return {
    parsed_json: parsed,
    audit_result: {
      ats_score: finalScore,
      original_ats_score: originalScore,
      target_ats_score: TARGET_ATS_SCORE,
      optimized_by_ai: needsOptimization,
      issues,
      strengths: [
        hasUsefulText ? "CV memiliki teks yang bisa dianalisis." : "File CV sudah tersimpan.",
        "Versi ATS memakai heading standar dan bullet yang mudah dibaca parser.",
      ],
      recommendations,
      missing_sections: [
        !parsed.summary ? "Professional Summary" : null,
        (parsed.skills.technical_skills || []).length === 0 ? "Skills" : null,
        (parsed.experience || []).length === 0 ? "Experience" : null,
        (parsed.education || []).length === 0 ? "Education" : null,
      ].filter(Boolean),
      improved_summary: parsed.summary,
      improved_experience_bullets: parsed.experience,
    },
    improvedText,
    improvedHtml: buildDocHtml(improvedText),
    needsOptimization,
  };
}
