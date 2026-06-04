import { getAnythingHeaders } from "./headers";

const KEYWORDS = [
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
  "python",
  "excel",
  "dashboard",
  "automation",
  "testing",
  "marketing",
  "sales",
  "finance",
  "operations",
  "management",
];

function sentenceList(text, limit = 6) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .split(/(?:\n|\. |\u2022|- )+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 12)
    .slice(0, limit);
}

function findKeywords(text) {
  const lower = String(text || "").toLowerCase();
  return KEYWORDS.filter((keyword) => lower.includes(keyword)).map((keyword) =>
    keyword.replace(/\b\w/g, (char) => char.toUpperCase()),
  );
}

function extractJsonAfter(label, text) {
  const start = String(text || "").indexOf(label);
  if (start < 0) return null;
  const afterLabel = text.slice(start + label.length);
  const nextSection = afterLabel.search(/\n\n[A-Z][A-Za-z ]+:\n/);
  const jsonText =
    nextSection >= 0 ? afterLabel.slice(0, nextSection) : afterLabel;

  try {
    return JSON.parse(jsonText.trim());
  } catch {
    return null;
  }
}

function buildFallbackJob(user) {
  const lines = sentenceList(user, 10);
  const rawDescription = String(user || "").split("Job Description:").pop() || "";
  const titleLine =
    lines.find((line) => /\b(engineer|developer|manager|analyst|staff|admin|specialist|designer)\b/i.test(line)) ||
    lines[0] ||
    "Untitled Role";
  const hardSkills = findKeywords(rawDescription);

  return {
    title: titleLine.slice(0, 90),
    company: "",
    location: "",
    salary: "",
    job_type: "",
    source: "Manual Input",
    job_url: "",
    description: rawDescription.trim() || String(user || "").trim(),
    requirements: lines.slice(0, 5),
    responsibilities: lines.slice(0, 5),
    hard_skills: hardSkills,
    soft_skills: ["Communication", "Problem Solving"],
    tools: hardSkills.filter((skill) =>
      ["React", "Node", "Postgres", "Supabase", "Vercel", "Excel"].includes(skill),
    ),
    education_requirement: "",
    experience_requirement: "",
    deadline: "",
    summary: lines[0] || "Lowongan ditambahkan dari input manual.",
    risk_notes: [],
  };
}

function buildFallbackMatch(user) {
  const cv = extractJsonAfter("CV JSON:\n", user) || {};
  const job = extractJsonAfter("Job:\n", user) || {};
  const cvSkills = [
    ...(cv?.skills?.technical_skills || []),
    ...(cv?.skills?.tools || []),
  ].map((skill) => String(skill).toLowerCase());
  const jobSkills = [
    ...(job?.hard_skills || []),
    ...(job?.tools || []),
  ].map((skill) => String(skill).toLowerCase());
  const matched = jobSkills.filter((skill) => cvSkills.includes(skill));
  const missing = jobSkills.filter((skill) => !cvSkills.includes(skill));
  const score = jobSkills.length
    ? Math.round((matched.length / jobSkills.length) * 70 + 20)
    : 55;

  return {
    match_score: Math.max(0, Math.min(100, score)),
    decision: score >= 75 ? "APPLY" : score >= 55 ? "REVIEW" : "SKIP",
    reason: "Fallback match dihitung dari overlap skill CV dan lowongan.",
    matched_skills: matched.map((skill) => skill.replace(/\b\w/g, (char) => char.toUpperCase())),
    missing_skills: missing.map((skill) => skill.replace(/\b\w/g, (char) => char.toUpperCase())),
    matched_experience: cv?.experience || [],
    risk_notes: [],
    recommended_cv_focus: missing.length
      ? ["Tekankan skill yang belum kuat pada CV untuk lowongan ini."]
      : ["CV sudah cukup selaras dengan keyword utama lowongan."],
  };
}

function buildFallbackTailoredCv(user) {
  const cv = extractJsonAfter("CV JSON:\n", user) || {};
  const job = extractJsonAfter("Job:\n", user) || {};
  const skills = [
    ...(cv?.skills?.technical_skills || []),
    ...(job?.hard_skills || []),
  ].filter(Boolean);

  return {
    title: `${job.company || "Company"} ${job.title || "Role"} Tailored CV`,
    professional_summary:
      cv.summary ||
      "Professional summary disusun dari CV aktif dan perlu disesuaikan lagi dengan detail lowongan.",
    prioritized_skills: [...new Set(skills)].slice(0, 10),
    experience_bullets: cv.experience || [],
    projects_to_highlight: cv.projects || [],
    keywords_used: job.hard_skills || [],
    warnings: [
      "Fallback digunakan karena provider AI eksternal belum tersedia. Data tidak ditambah di luar CV asli.",
    ],
  };
}

function buildFallbackCoverLetter(user) {
  const cv = extractJsonAfter("CV JSON:\n", user) || {};
  const job = extractJsonAfter("Job:\n", user) || {};
  const name = cv?.personal_info?.name || "Candidate";
  const title = job?.title || "the role";
  const company = job?.company || "your company";

  return {
    language: "id",
    subject: `Lamaran untuk posisi ${title}`,
    content: `Halo Tim ${company},\n\nSaya ${name} tertarik melamar posisi ${title}. Berdasarkan CV saya, pengalaman dan skill utama saya relevan untuk kebutuhan role ini. Saya siap berdiskusi lebih lanjut mengenai bagaimana saya dapat membantu tim mencapai target kerja.\n\nTerima kasih atas waktunya.`,
    warnings: [
      "Fallback digunakan karena provider AI eksternal belum tersedia. Periksa ulang sebelum dikirim.",
    ],
  };
}

function buildFallbackResult({ schema, user }) {
  switch (schema?.name) {
    case "job_parser":
      return buildFallbackJob(user);
    case "match_score":
      return buildFallbackMatch(user);
    case "tailored_cv":
      return buildFallbackTailoredCv(user);
    case "cover_letter":
      return buildFallbackCoverLetter(user);
    default:
      throw new Error(`No fallback is available for schema ${schema?.name || "unknown"}`);
  }
}

export async function generateJsonWithAI({ system, user, schema }) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_CREATE_APP_URL}/integrations/google-gemini-2-5-pro/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAnythingHeaders()
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          json_schema: schema,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `AI request failed with [${response.status}] ${response.statusText}`,
      );
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("AI response did not include content");
    }

    return JSON.parse(content);
  } catch (error) {
    console.info("AI JSON fallback used:", error?.message || error);
    return buildFallbackResult({ schema, user });
  }
}
