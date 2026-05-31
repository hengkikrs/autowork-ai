"use client";

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import {
  ArrowLeft,
  FileText,
  Loader2,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

async function fetchJob(id) {
  const response = await fetch(`/api/jobs/${id}`);
  if (!response.ok) {
    throw new Error("Tidak bisa mengambil detail lowongan");
  }
  return response.json();
}

async function fetchCVs() {
  const response = await fetch("/api/cv");
  if (!response.ok) {
    throw new Error("Tidak bisa mengambil CV");
  }
  return response.json();
}

export default function JobDetailPage(props) {
  const jobId = props.params.id;
  const queryClient = useQueryClient();
  const [selectedCvId, setSelectedCvId] = useState("");
  const [tailoredPreview, setTailoredPreview] = useState(null);
  const [letterPreview, setLetterPreview] = useState(null);
  const [message, setMessage] = useState(null);

  const { data: jobData, isLoading } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => fetchJob(jobId),
  });
  const { data: cvData } = useQuery({ queryKey: ["cvs"], queryFn: fetchCVs });
  const cvs = cvData?.cvs || [];
  const activeCvId = selectedCvId || cvs[0]?.id || "";
  const job = jobData?.job;
  const details = job?.match_details || {};
  const matchedSkills = details.matched_skills || [];
  const missingSkills = details.missing_skills || [];
  const recommendedFocus = details.recommended_cv_focus || [];

  const matchMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvId: activeCvId, jobId }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Tidak bisa menghitung match score");
      }
      return response.json();
    },
    onSuccess: () => {
      setMessage("Match score berhasil dibuat.");
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (error) => {
      console.error(error);
      setMessage(error.message);
    },
  });

  const tailorMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/tailor/cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvId: activeCvId, jobId }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Tidak bisa membuat tailored CV");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setTailoredPreview(data.content);
      setMessage("Tailored CV preview sudah dibuat.");
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
    },
    onError: (error) => setMessage(error.message),
  });

  const letterMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/tailor/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvId: activeCvId, jobId }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Tidak bisa membuat cover letter");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setLetterPreview(data.content);
      setMessage("Cover letter sudah dibuat.");
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
    },
    onError: (error) => setMessage(error.message),
  });

  const prepareMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/apply/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvId: activeCvId, jobId }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Tidak bisa menyiapkan apply");
      }
      return response.json();
    },
    onSuccess: () => {
      setMessage("Manual Assist siap. Review dokumen lalu buka link apply.");
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
    },
    onError: (error) => setMessage(error.message),
  });

  const matchLoading = matchMutation.isPending || matchMutation.isLoading;
  const tailorLoading = tailorMutation.isPending || tailorMutation.isLoading;
  const letterLoading = letterMutation.isPending || letterMutation.isLoading;
  const prepareLoading = prepareMutation.isPending || prepareMutation.isLoading;

  const handleMatch = useCallback(() => {
    if (!activeCvId) {
      setMessage("Upload CV dulu sebelum menghitung match score.");
      return;
    }
    matchMutation.mutate();
  }, [activeCvId, matchMutation]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-[#F8FAFC] items-center justify-center text-[#64748B]">
        Memuat detail lowongan...
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-screen bg-[#F8FAFC] items-center justify-center text-[#64748B]">
        Lowongan tidak ditemukan.
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Navigation />
      <main className="flex-1 ml-64 p-10">
        <div className="max-w-6xl mx-auto space-y-8">
          <a
            href="/jobs"
            className="inline-flex items-center gap-2 text-[#2563EB] font-bold"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke jobs
          </a>

          <section className="bg-white rounded-3xl p-8 border border-[#E2E8F0] shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
              <div>
                <h1 className="text-4xl font-black text-[#0F172A]">
                  {job.title}
                </h1>
                <p className="text-xl text-[#64748B] mt-2">
                  {job.company} · {job.location || "Lokasi belum tersedia"}
                </p>
                <p className="text-[#64748B] mt-3 max-w-3xl">
                  {job.description}
                </p>
              </div>
              <div className="rounded-3xl bg-blue-50 p-6 text-center min-w-[180px]">
                <p className="text-sm font-bold text-blue-700 uppercase">
                  Match Score
                </p>
                <p className="text-5xl font-black text-[#0F172A] mt-2">
                  {job.match_score || 0}%
                </p>
                <p className="text-sm font-bold text-[#64748B] mt-1">
                  {job.decision || "Belum dicek"}
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-3xl p-8 border border-[#E2E8F0] shadow-sm">
            <h2 className="text-2xl font-bold text-[#0F172A] mb-5">
              Action Center
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
              <select
                value={activeCvId}
                onChange={(event) => setSelectedCvId(event.target.value)}
                className="rounded-2xl border border-[#CBD5E1] px-4 py-3 outline-none focus:border-[#2563EB] md:col-span-4"
              >
                {cvs.length === 0 ? (
                  <option value="">Upload CV dulu</option>
                ) : (
                  cvs.map((cv) => (
                    <option key={cv.id} value={cv.id}>
                      CV #{cv.id} ·{" "}
                      {new Date(cv.created_at).toLocaleDateString("id-ID")}
                    </option>
                  ))
                )}
              </select>
              <button
                onClick={handleMatch}
                disabled={matchLoading}
                className="rounded-2xl bg-[#2563EB] text-white px-4 py-3 font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {matchLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-5 w-5" />
                )}{" "}
                Match
              </button>
              <button
                onClick={() => tailorMutation.mutate()}
                disabled={!activeCvId || tailorLoading}
                className="rounded-2xl bg-[#0F172A] text-white px-4 py-3 font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {tailorLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <FileText className="h-5 w-5" />
                )}{" "}
                Tailored CV
              </button>
              <button
                onClick={() => letterMutation.mutate()}
                disabled={!activeCvId || letterLoading}
                className="rounded-2xl bg-white border border-[#CBD5E1] text-[#0F172A] px-4 py-3 font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {letterLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Mail className="h-5 w-5" />
                )}{" "}
                Cover Letter
              </button>
              <button
                onClick={() => prepareMutation.mutate()}
                disabled={!activeCvId || prepareLoading}
                className="rounded-2xl bg-green-600 text-white px-4 py-3 font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Sparkles className="h-5 w-5" /> Manual Assist
              </button>
            </div>
            {message && (
              <div className="rounded-2xl bg-slate-50 border border-[#E2E8F0] p-4 text-[#0F172A] font-medium">
                {message}
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="bg-white rounded-3xl p-6 border border-[#E2E8F0]">
              <h3 className="font-black text-[#0F172A] mb-4">Matched Skills</h3>
              <div className="flex flex-wrap gap-2">
                {matchedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm font-bold"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>
            <section className="bg-white rounded-3xl p-6 border border-[#E2E8F0]">
              <h3 className="font-black text-[#0F172A] mb-4">Missing Skills</h3>
              <div className="flex flex-wrap gap-2">
                {missingSkills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-sm font-bold"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>
            <section className="bg-white rounded-3xl p-6 border border-[#E2E8F0]">
              <h3 className="font-black text-[#0F172A] mb-4">Fokus CV</h3>
              <ul className="space-y-2 text-[#64748B]">
                {recommendedFocus.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </section>
          </div>

          {tailoredPreview && (
            <section className="bg-white rounded-3xl p-8 border border-[#E2E8F0] shadow-sm">
              <h2 className="text-2xl font-bold text-[#0F172A] mb-4">
                Preview Tailored CV
              </h2>
              <p className="text-[#0F172A] font-bold mb-3">
                {tailoredPreview.professional_summary}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {tailoredPreview.prioritized_skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-bold"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <ul className="space-y-2 text-[#475569]">
                {tailoredPreview.experience_bullets.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </section>
          )}

          {letterPreview && (
            <section className="bg-white rounded-3xl p-8 border border-[#E2E8F0] shadow-sm">
              <h2 className="text-2xl font-bold text-[#0F172A] mb-4">
                Preview Cover Letter
              </h2>
              <p className="whitespace-pre-line text-[#475569] leading-7">
                {letterPreview.content}
              </p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
