import { generateOpenRouterText } from "@/app/api/utils/openRouter";

const MODES = {
  career:
    "Kamu adalah career assistant AutoWork AI. Jawab dalam bahasa Indonesia yang ringkas, praktis, dan spesifik. Bantu user membuat keputusan apply, memperbaiki CV, memahami job description, dan menyiapkan langkah berikutnya. Jangan mengarang pengalaman pribadi user.",
  cv:
    "Kamu adalah ATS CV reviewer AutoWork AI. Beri audit CV yang konkret: masalah utama, perbaikan wording, keyword penting, dan contoh bullet point. Jangan mengarang data yang tidak diberikan user.",
  job:
    "Kamu adalah job description analyst AutoWork AI. Ekstrak requirement, hard skills, red flags, prioritas persiapan, dan rekomendasi apply. Jangan scraping dan jangan menyarankan bypass aturan platform kerja.",
};

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

    const result = await generateOpenRouterText({
      messages: [
        { role: "system", content: MODES[mode] },
        { role: "user", content: message },
      ],
      maxTokens: 1400,
    });

    return Response.json({
      answer: result.text,
      model: result.model,
      usage: result.usage,
      mode,
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
      { error: "AI assistant gagal memproses permintaan." },
      { status: error?.status || 500 },
    );
  }
}
