import { generateOpenRouterText } from "@/app/api/utils/openRouter";
import sql from "@/app/api/utils/sql";
import { ensureAppUser } from "@/app/api/utils/appUser";
import { auth } from "@/auth";

const MODES = {
  career:
    "Kamu adalah career assistant AutoWork AI. Jawab dalam bahasa Indonesia yang ringkas, praktis, dan spesifik. Bantu user membuat keputusan apply, memperbaiki CV, memahami job description, dan menyiapkan langkah berikutnya. Jangan mengarang pengalaman pribadi user.",
  cv:
    "Kamu adalah ATS CV reviewer AutoWork AI. Beri audit CV yang konkret: masalah utama, perbaikan wording, keyword penting, dan contoh bullet point. Jangan mengarang data yang tidak diberikan user.",
  job:
    "Kamu adalah job description analyst AutoWork AI. Ekstrak requirement, hard skills, red flags, prioritas persiapan, dan rekomendasi apply. Jangan scraping dan jangan menyarankan bypass aturan platform kerja.",
};

function truncateForPrompt(value, limit) {
  const text = String(value || "").trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}\n\n[Dipendekkan agar konteks tetap aman diproses.]`;
}

async function getCvContext(cvId) {
  if (!cvId) return null;

  const session = await auth();
  if (!session?.user?.id) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }

  const user = await ensureAppUser(session);
  const rows = await sql`
    SELECT id, raw_text, parsed_json, audit_result, created_at
    FROM cvs
    WHERE id = ${cvId} AND user_id = ${user.id}
    LIMIT 1
  `;

  if (rows.length === 0) {
    const error = new Error("CV tidak ditemukan.");
    error.status = 404;
    throw error;
  }

  const cv = rows[0];
  return {
    id: cv.id,
    prompt: [
      `CV tersimpan AutoWork AI #${cv.id}`,
      `Tanggal upload: ${cv.created_at}`,
      `Audit ATS:\n${truncateForPrompt(JSON.stringify(cv.audit_result || {}, null, 2), 3000)}`,
      `Parsed CV:\n${truncateForPrompt(JSON.stringify(cv.parsed_json || {}, null, 2), 4000)}`,
      `Teks CV:\n${truncateForPrompt(cv.raw_text || "", 7000)}`,
    ].join("\n\n"),
  };
}

export async function GET() {
  return Response.json({
    configured: Boolean(process.env.OPENROUTER_API_KEY),
    model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
    modes: Object.keys(MODES),
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const message = String(body.message || "").trim();
    const mode = MODES[body.mode] ? body.mode : "career";

    if (!message) {
      return Response.json(
        { error: "Tulis pertanyaan atau paste CV/job description dulu." },
        { status: 400 },
      );
    }

    if (message.length > 12000) {
      return Response.json(
        { error: "Input terlalu panjang. Ringkas dulu maksimal sekitar 12.000 karakter." },
        { status: 400 },
      );
    }

    const cvContext = await getCvContext(body.cvId);
    const userContent = cvContext
      ? `${cvContext.prompt}\n\nPertanyaan user:\n${message}`
      : message;

    const result = await generateOpenRouterText({
      messages: [
        {
          role: "system",
          content: `${MODES[mode]} Jika konteks CV tersimpan disertakan, gunakan konteks itu sebagai sumber utama dan jangan mengarang data di luar CV.`,
        },
        { role: "user", content: userContent },
      ],
      maxTokens: 1400,
    });

    return Response.json({
      answer: result.text,
      model: result.model,
      usage: result.usage,
      mode,
      cvId: cvContext?.id || null,
    });
  } catch (error) {
    console.error("AI assistant error:", error);

    if (error?.code === "OPENROUTER_NOT_CONFIGURED") {
      return Response.json(
        { error: "OpenRouter belum dikonfigurasi. Set OPENROUTER_API_KEY di .env." },
        { status: 503 },
      );
    }

    return Response.json(
      { error: error?.message || "AI assistant gagal memproses permintaan." },
      { status: error?.status || 500 },
    );
  }
}
