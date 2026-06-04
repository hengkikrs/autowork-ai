"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import {
  Bot,
  Briefcase,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Pencil,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

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
    placeholder:
      "Tulis instruksi untuk CV aktif, contoh: audit ATS dan perbaiki bullet pengalaman...",
  },
  {
    id: "job",
    label: "Job Analysis",
    icon: Briefcase,
    placeholder: "Paste job description untuk dianalisis requirement dan red flag...",
  },
];

async function fetchCVs() {
  const response = await fetch("/api/cv");
  if (!response.ok) {
    throw new Error("Tidak bisa mengambil CV");
  }
  return response.json();
}

async function readApiError(response, fallback) {
  const body = await response.json().catch(() => ({}));
  return new Error(body.error || fallback);
}

function formatDate(value) {
  if (!value) return "Tanggal belum tersedia";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getCvName(cv) {
  return cv?.file_name || `CV #${cv?.id}`;
}

function getAtsScore(cv) {
  const score = cv?.audit_result?.ats_score;
  return typeof score === "number" ? score : null;
}

function buildAuditAnswer(result) {
  const audit = result?.audit_result || {};
  const recommendations = audit.recommendations || [];
  const issues = audit.issues || [];
  const lines = [
    `ATS Score: ${audit.ats_score ?? 0}%`,
    typeof audit.original_ats_score === "number" &&
    audit.original_ats_score !== audit.ats_score
      ? `Original score: ${audit.original_ats_score}%`
      : null,
    audit.optimized_by_ai
      ? "Status: CV sudah diperbaiki otomatis dan versi aktif sudah diganti."
      : audit.needs_user_text
        ? "Status: AI butuh teks CV yang lebih lengkap sebelum bisa rewrite aman."
        : "Status: Audit selesai.",
    "",
    issues.length ? "Masalah utama:" : null,
    ...issues.slice(0, 5).map((item) => `- ${item}`),
    "",
    recommendations.length ? "Rekomendasi:" : null,
    ...recommendations.slice(0, 5).map((item) => `- ${item}`),
  ];

  return lines.filter((line) => line !== null).join("\n");
}

export default function AiAssistantPage() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState("career");
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState("");
  const [model, setModel] = useState("");
  const [error, setError] = useState("");
  const [cvMessage, setCvMessage] = useState("");
  const [selectedCvId, setSelectedCvId] = useState("");
  const [editingCvId, setEditingCvId] = useState("");
  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: cvData, isLoading: loadingCvs } = useQuery({
    queryKey: ["cvs"],
    queryFn: fetchCVs,
  });
  const cvs = cvData?.cvs || [];
  const selectedCv = useMemo(
    () =>
      cvs.find((cv) => String(cv.id) === String(selectedCvId)) ||
      cvs[0] ||
      null,
    [cvs, selectedCvId],
  );

  const activeMode = useMemo(
    () => modes.find((item) => item.id === mode) || modes[0],
    [mode],
  );

  useEffect(() => {
    if (!cvs.length) {
      setSelectedCvId("");
      return;
    }

    if (!selectedCvId || !cvs.some((cv) => String(cv.id) === String(selectedCvId))) {
      setSelectedCvId(String(cvs[0].id));
    }
  }, [cvs, selectedCvId]);

  const processCvMutation = useMutation({
    mutationFn: async (cvId) => {
      const response = await fetch("/api/cv/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvId }),
      });

      if (!response.ok) {
        throw await readApiError(response, "Tidak bisa mengecek CV");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cvs"] });
      setMode("cv");
      setAnswer(buildAuditAnswer(data));
      setModel(data?.audit_result?.ai_model || "CV ATS Agent");
      setError("");
      setCvMessage("Pengecekan CV selesai.");
    },
    onError: (mutationError) => {
      console.error(mutationError);
      setCvMessage(mutationError.message);
    },
  });

  const saveCvMutation = useMutation({
    mutationFn: async ({ cvId, rawText }) => {
      const response = await fetch("/api/cv", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvId, rawText }),
      });

      if (!response.ok) {
        throw await readApiError(response, "Tidak bisa menyimpan CV");
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      setEditingCvId("");
      setEditText("");
      setCvMessage("Teks CV disimpan. AI sedang cek ulang ATS.");
      queryClient.invalidateQueries({ queryKey: ["cvs"] });
      processCvMutation.mutate(variables.cvId);
    },
    onError: (mutationError) => {
      console.error(mutationError);
      setCvMessage(mutationError.message);
    },
  });

  const deleteCvMutation = useMutation({
    mutationFn: async (cvId) => {
      const response = await fetch("/api/cv", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvId }),
      });

      if (!response.ok) {
        throw await readApiError(response, "Tidak bisa menghapus CV");
      }

      return response.json();
    },
    onSuccess: (_data, cvId) => {
      if (String(selectedCvId) === String(cvId)) {
        setSelectedCvId("");
      }
      setEditingCvId("");
      setEditText("");
      setCvMessage("CV berhasil dihapus.");
      queryClient.invalidateQueries({ queryKey: ["cvs"] });
    },
    onError: (mutationError) => {
      console.error(mutationError);
      setCvMessage(mutationError.message);
    },
  });

  function handleUseCv(cv) {
    setSelectedCvId(String(cv.id));
    setMode("cv");
    setMessage(
      "Audit CV tersimpan ini. Beri skor ATS, masalah utama, prioritas perbaikan, dan contoh rewrite yang tetap memakai data asli.",
    );
    setCvMessage(`${getCvName(cv)} dipakai sebagai konteks AI.`);
  }

  function handleEditCv(cv) {
    setSelectedCvId(String(cv.id));
    setEditingCvId(String(cv.id));
    setEditText(cv.raw_text || "");
    setCvMessage("");
  }

  function handleDeleteCv(cv) {
    const confirmed = window.confirm(`Hapus ${getCvName(cv)} dari AutoWork AI?`);
    if (!confirmed) return;
    deleteCvMutation.mutate(cv.id);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      setError("Tulis pertanyaan atau pilih CV lalu isi instruksi dulu.");
      return;
    }

    setLoading(true);
    setError("");
    setAnswer("");

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          message: trimmed,
          cvId: selectedCv?.id,
        }),
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

  const processLoading = processCvMutation.isPending || processCvMutation.isLoading;
  const saveLoading = saveCvMutation.isPending || saveCvMutation.isLoading;
  const deleteLoading = deleteCvMutation.isPending || deleteCvMutation.isLoading;

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
                  Analisis CV upload, lowongan, dan strategi apply dari satu tempat.
                </p>
              </div>
            </div>
          </header>

          <section className="grid grid-cols-1 xl:grid-cols-[500px_1fr] gap-6">
            <div className="space-y-6">
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

                {selectedCv && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2563EB]">
                          CV aktif
                        </p>
                        <p className="mt-1 font-black text-[#0F172A]">
                          {getCvName(selectedCv)}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-[#1D4ED8]">
                        {getAtsScore(selectedCv) ?? "-"}%
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[#64748B]">
                      Pertanyaan akan memakai CV ini sebagai konteks AI.
                    </p>
                  </div>
                )}

                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={activeMode.placeholder}
                  rows={11}
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

              <section className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-[#0F172A]">
                      CV yang sudah diupload
                    </h2>
                    <p className="text-sm text-[#64748B]">
                      Pilih, cek ATS, edit teks, atau hapus CV.
                    </p>
                  </div>
                  <a
                    href="/upload-cv"
                    className="rounded-xl bg-[#0F172A] px-4 py-2 text-sm font-bold text-white"
                  >
                    Upload
                  </a>
                </div>

                {cvMessage && (
                  <div className="mb-4 rounded-2xl bg-slate-50 border border-[#E2E8F0] p-3 text-sm font-semibold text-[#0F172A]">
                    {cvMessage}
                  </div>
                )}

                {loadingCvs ? (
                  <div className="rounded-2xl border border-[#E2E8F0] p-6 text-center text-[#64748B]">
                    Memuat CV...
                  </div>
                ) : cvs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#CBD5E1] p-6 text-center">
                    <FileText className="h-9 w-9 text-[#2563EB] mx-auto mb-3" />
                    <p className="font-bold text-[#0F172A]">Belum ada CV</p>
                    <p className="text-sm text-[#64748B] mt-1">
                      Upload CV dulu agar AI bisa screening dan memberi score ATS.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cvs.map((cv) => {
                      const selected = String(selectedCv?.id) === String(cv.id);
                      const editing = String(editingCvId) === String(cv.id);
                      const score = getAtsScore(cv);
                      const processingThisCv =
                        processLoading &&
                        String(processCvMutation.variables) === String(cv.id);
                      const deletingThisCv =
                        deleteLoading &&
                        String(deleteCvMutation.variables) === String(cv.id);
                      const savingThisCv =
                        saveLoading &&
                        String(saveCvMutation.variables?.cvId) === String(cv.id);

                      return (
                        <div
                          key={cv.id}
                          className={`rounded-2xl border p-4 transition-all ${
                            selected
                              ? "border-[#2563EB] bg-blue-50"
                              : "border-[#E2E8F0] bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => setSelectedCvId(String(cv.id))}
                              className="min-w-0 flex-1 text-left"
                            >
                              <div className="flex items-center gap-2">
                                {selected && (
                                  <CheckCircle2 className="h-4 w-4 text-[#2563EB]" />
                                )}
                                <p className="truncate font-black text-[#0F172A]">
                                  {getCvName(cv)}
                                </p>
                              </div>
                              <p className="mt-1 text-xs font-semibold text-[#64748B]">
                                Upload {formatDate(cv.created_at)} - ATS{" "}
                                {score ?? "belum dicek"}%
                              </p>
                            </button>
                            {cv.file_url && (
                              <a
                                href={cv.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-xl border border-[#CBD5E1] p-2 text-[#64748B] hover:text-[#2563EB]"
                                title="Download CV"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            )}
                          </div>

                          {editing ? (
                            <div className="mt-4 space-y-3">
                              <textarea
                                value={editText}
                                onChange={(event) => setEditText(event.target.value)}
                                rows={8}
                                className="w-full resize-none rounded-2xl border border-[#CBD5E1] px-4 py-3 text-sm text-[#0F172A] outline-none focus:border-[#2563EB]"
                              />
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    saveCvMutation.mutate({
                                      cvId: cv.id,
                                      rawText: editText,
                                    })
                                  }
                                  disabled={savingThisCv}
                                  className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                                >
                                  {savingThisCv ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Save className="h-4 w-4" />
                                  )}
                                  Simpan & cek ulang
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCvId("");
                                    setEditText("");
                                  }}
                                  className="inline-flex items-center gap-2 rounded-xl border border-[#CBD5E1] px-4 py-2 text-sm font-bold text-[#0F172A]"
                                >
                                  <X className="h-4 w-4" />
                                  Batal
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-4 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => handleUseCv(cv)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#CBD5E1] px-3 py-2 text-sm font-bold text-[#0F172A] hover:border-[#2563EB]"
                              >
                                <Bot className="h-4 w-4" />
                                Pakai
                              </button>
                              <button
                                type="button"
                                onClick={() => processCvMutation.mutate(cv.id)}
                                disabled={processingThisCv}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
                              >
                                {processingThisCv ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ShieldCheck className="h-4 w-4" />
                                )}
                                Cek ATS
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditCv(cv)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#CBD5E1] px-3 py-2 text-sm font-bold text-[#0F172A] hover:border-[#2563EB]"
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCv(cv)}
                                disabled={deletingThisCv}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-100 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
                              >
                                {deletingThisCv ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                                Hapus
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

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
                  "Pilih CV upload atau mode chat, lalu kirim instruksi ke AI."}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
