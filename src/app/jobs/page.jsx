"use client";

import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import { Briefcase, Loader2, Plus, Sparkles, ExternalLink } from "lucide-react";

async function fetchJobs() {
  const response = await fetch("/api/jobs");
  if (!response.ok) {
    throw new Error("Tidak bisa mengambil daftar lowongan");
  }
  return response.json();
}

export default function JobsPage() {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [source, setSource] = useState("Manual Input");
  const [error, setError] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs,
  });
  const jobs = data?.jobs || [];

  const createJobMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, jobUrl, source }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Tidak bisa memproses lowongan");
      }
      return response.json();
    },
    onSuccess: () => {
      setDescription("");
      setJobUrl("");
      setSource("Manual Input");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (mutationError) => {
      console.error(mutationError);
      setError(mutationError.message);
    },
  });

  const createJobLoading =
    createJobMutation.isPending || createJobMutation.isLoading;

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      if (!description.trim()) {
        setError("Paste job description dulu ya.");
        return;
      }
      createJobMutation.mutate();
    },
    [description, createJobMutation],
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Navigation />
      <main className="flex-1 ml-64 p-10">
        <div className="max-w-6xl mx-auto space-y-8">
          <header>
            <p className="text-sm font-bold text-[#2563EB] uppercase tracking-[0.2em]">
              MVP 2
            </p>
            <h1 className="text-4xl font-extrabold text-[#0F172A] tracking-tight">
              Job Matching
            </h1>
            <p className="text-[#64748B] text-lg mt-2">
              Paste lowongan kerja, lalu AI akan parsing dan menyiapkan match
              score.
            </p>
          </header>

          <section className="bg-white rounded-3xl p-8 border border-[#E2E8F0] shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-[#2563EB]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#0F172A]">
                  Tambah lowongan manual
                </h2>
                <p className="text-[#64748B]">
                  Mode aman untuk portal besar: user tetap review dan submit
                  sendiri.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  value={jobUrl}
                  onChange={(event) => setJobUrl(event.target.value)}
                  placeholder="Link apply / career page (opsional)"
                  className="w-full rounded-2xl border border-[#CBD5E1] px-4 py-3 outline-none focus:border-[#2563EB]"
                />
                <input
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  placeholder="Source, contoh: Career Page"
                  className="w-full rounded-2xl border border-[#CBD5E1] px-4 py-3 outline-none focus:border-[#2563EB]"
                />
              </div>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Paste job description di sini..."
                rows={8}
                className="w-full rounded-2xl border border-[#CBD5E1] px-4 py-3 outline-none focus:border-[#2563EB]"
              />
              {error && (
                <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-red-700 font-medium">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={createJobLoading}
                className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-[#1D4ED8] disabled:opacity-60"
              >
                {createJobLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Plus className="h-5 w-5" />
                )}
                Parse Job
              </button>
            </form>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#0F172A]">
                Daftar lowongan
              </h2>
              <span className="text-sm text-[#64748B]">
                {jobs.length} lowongan
              </span>
            </div>

            {isLoading ? (
              <div className="bg-white rounded-3xl p-10 border border-[#E2E8F0] text-center text-[#64748B]">
                Memuat lowongan...
              </div>
            ) : jobs.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 border border-[#E2E8F0] text-center">
                <Briefcase className="h-10 w-10 text-[#2563EB] mx-auto mb-3" />
                <p className="font-bold text-[#0F172A]">Belum ada lowongan</p>
                <p className="text-[#64748B]">
                  Tambahkan job description pertama untuk mulai matching.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {jobs.map((job) => {
                  const scoreLabel = job.match_score
                    ? `${job.match_score}%`
                    : "Belum dicek";
                  const decisionLabel = job.decision || "REVIEW";
                  return (
                    <a
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="bg-white rounded-3xl p-6 border border-[#E2E8F0] hover:border-[#2563EB] hover:shadow-lg transition-all block"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-black text-[#0F172A]">
                            {job.title || "Untitled Role"}
                          </h3>
                          <p className="text-[#64748B] font-medium">
                            {job.company || "Unknown Company"}
                          </p>
                        </div>
                        <ExternalLink className="h-5 w-5 text-[#94A3B8]" />
                      </div>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-bold">
                          {scoreLabel}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-bold">
                          {decisionLabel}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-bold">
                          {job.location || "Lokasi belum ada"}
                        </span>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
