"use client";

import { useMemo, useState } from "react";
import Navigation from "@/components/Navigation";
import { Bot, Briefcase, FileText, Loader2, Send, Sparkles } from "lucide-react";

const modes = [
  {
    id: "career",
    label: "Career",
    icon: Sparkles,
    placeholder:
      "Tanya strategi apply, cara menjawab recruiter, atau langkah berikutnya...",
  },
  {
    id: "cv",
    label: "CV Review",
    icon: FileText,
    placeholder: "Paste isi CV, lalu minta audit ATS atau perbaikan bullet point...",
  },
  {
    id: "job",
    label: "Job Analysis",
    icon: Briefcase,
    placeholder: "Paste job description untuk dianalisis requirement dan red flag...",
  },
];

export default function AiAssistantPage() {
  const [mode, setMode] = useState("career");
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState("");
  const [model, setModel] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const activeMode = useMemo(
    () => modes.find((item) => item.id === mode) || modes[0],
    [mode],
  );

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      setError("Tulis pertanyaan atau paste teks dulu.");
      return;
    }

    setLoading(true);
    setError("");
    setAnswer("");

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, message: trimmed }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "AI assistant gagal memproses permintaan.");
      }

      setAnswer(body.answer || "");
      setModel(body.model || "");
    } catch (requestError) {
      console.error(requestError);
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Navigation />
      <main className="flex-1 ml-64 p-10">
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="flex flex-col gap-3">
            <p className="text-sm font-bold text-[#2563EB] uppercase tracking-[0.2em]">
              OpenRouter AI
            </p>
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Bot className="h-7 w-7 text-[#2563EB]" />
              </div>
              <div>
                <h1 className="text-4xl font-extrabold text-[#0F172A] tracking-tight">
                  AI Assistant
                </h1>
                <p className="text-[#64748B] text-lg mt-1">
                  Analisis CV, lowongan, dan strategi apply dari satu tempat.
                </p>
              </div>
            </div>
          </header>

          <section className="grid grid-cols-1 xl:grid-cols-[440px_1fr] gap-6">
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-6 space-y-5"
            >
              <div className="grid grid-cols-3 gap-2">
                {modes.map((item) => {
                  const Icon = item.icon;
                  const selected = mode === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMode(item.id)}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold transition-all ${
                        selected
                          ? "border-[#2563EB] bg-blue-50 text-[#1D4ED8]"
                          : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#CBD5E1]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={activeMode.placeholder}
                rows={14}
                className="w-full resize-none rounded-2xl border border-[#CBD5E1] px-4 py-3 text-[#0F172A] outline-none focus:border-[#2563EB]"
              />

              {error && (
                <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-6 py-3 font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-[#1D4ED8] disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
                {loading ? "Memproses..." : "Ask AI"}
              </button>
            </form>

            <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-6 min-h-[520px]">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
                <div>
                  <h2 className="text-xl font-black text-[#0F172A]">Response</h2>
                  <p className="text-sm text-[#64748B]">
                    {model ? `Model: ${model}` : "Output AI akan muncul di sini."}
                  </p>
                </div>
                <Bot className="h-6 w-6 text-[#2563EB]" />
              </div>

              <div className="prose prose-slate max-w-none whitespace-pre-wrap pt-6 text-[#334155] leading-7">
                {answer ||
                  "Pilih mode, paste CV atau job description, lalu kirim ke AI."}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
