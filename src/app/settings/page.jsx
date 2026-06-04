"use client";

import { useEffect, useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import {
  CalendarDays,
  Download,
  FileText,
  HardDrive,
  Save,
  Settings as SettingsIcon,
} from "lucide-react";

async function fetchPreferences() {
  const response = await fetch("/api/preferences");
  if (!response.ok) {
    throw new Error("Tidak bisa mengambil preferensi");
  }
  return response.json();
}

async function fetchCVs() {
  const response = await fetch("/api/cv");
  if (!response.ok) {
    throw new Error("Tidak bisa mengambil file CV");
  }
  return response.json();
}

function splitText(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatBytes(bytes) {
  if (!bytes) return "Ukuran tidak tersedia";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    target_roles: "",
    locations: "",
    job_type: "Full-time",
    min_salary: "",
    remote_preference: "Hybrid",
    preferred_industries: "",
    blacklisted_companies: "",
    daily_apply_limit: "5",
  });
  const [message, setMessage] = useState(null);

  const { data } = useQuery({
    queryKey: ["preferences"],
    queryFn: fetchPreferences,
  });
  const {
    data: cvData,
    isLoading: loadingCVs,
    error: cvError,
  } = useQuery({
    queryKey: ["cvs"],
    queryFn: fetchCVs,
  });
  const cvs = cvData?.cvs || [];

  useEffect(() => {
    const preferences = data?.preferences;
    if (!preferences) return;
    setForm({
      target_roles: (preferences.target_roles || []).join(", "),
      locations: (preferences.locations || []).join(", "),
      job_type: (preferences.job_type || []).join(", ") || "Full-time",
      min_salary: preferences.min_salary || "",
      remote_preference: preferences.remote_preference || "Hybrid",
      preferred_industries: (preferences.preferred_industries || []).join(", "),
      blacklisted_companies: (preferences.blacklisted_companies || []).join(
        ", ",
      ),
      daily_apply_limit: preferences.daily_apply_limit || "5",
    });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        target_roles: splitText(form.target_roles),
        locations: splitText(form.locations),
        job_type: splitText(form.job_type),
        min_salary: form.min_salary ? Number(form.min_salary) : null,
        remote_preference: form.remote_preference,
        preferred_industries: splitText(form.preferred_industries),
        blacklisted_companies: splitText(form.blacklisted_companies),
        daily_apply_limit: Number(form.daily_apply_limit || 5),
      };
      const response = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Tidak bisa menyimpan preferensi");
      }
      return response.json();
    },
    onSuccess: () => {
      setMessage("Preferensi berhasil disimpan.");
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
    },
    onError: (error) => {
      console.error(error);
      setMessage(error.message);
    },
  });

  const saveLoading = saveMutation.isPending || saveMutation.isLoading;

  const updateField = useCallback((field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Navigation />
      <main className="flex-1 ml-64 p-10">
        <div className="max-w-4xl mx-auto space-y-8">
          <header>
            <p className="text-sm font-bold text-[#2563EB] uppercase tracking-[0.2em]">
              Job Preference
            </p>
            <h1 className="text-4xl font-extrabold text-[#0F172A] tracking-tight">
              Settings
            </h1>
            <p className="text-[#64748B] text-lg mt-2">
              Atur target role, lokasi, gaji, dan blacklist perusahaan.
            </p>
          </header>

          <section className="bg-white rounded-3xl p-8 border border-[#E2E8F0] shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                <SettingsIcon className="h-6 w-6 text-[#2563EB]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#0F172A]">
                  Preferensi kerja
                </h2>
                <p className="text-[#64748B]">
                  Pisahkan beberapa nilai dengan koma.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <label className="space-y-2">
                <span className="font-bold text-[#0F172A]">Target role</span>
                <input
                  value={form.target_roles}
                  onChange={(event) =>
                    updateField("target_roles", event.target.value)
                  }
                  className="w-full rounded-2xl border border-[#CBD5E1] px-4 py-3 outline-none focus:border-[#2563EB]"
                  placeholder="Data Analyst, GIS Analyst"
                />
              </label>
              <label className="space-y-2">
                <span className="font-bold text-[#0F172A]">Lokasi</span>
                <input
                  value={form.locations}
                  onChange={(event) =>
                    updateField("locations", event.target.value)
                  }
                  className="w-full rounded-2xl border border-[#CBD5E1] px-4 py-3 outline-none focus:border-[#2563EB]"
                  placeholder="Jakarta, Remote"
                />
              </label>
              <label className="space-y-2">
                <span className="font-bold text-[#0F172A]">Job type</span>
                <input
                  value={form.job_type}
                  onChange={(event) =>
                    updateField("job_type", event.target.value)
                  }
                  className="w-full rounded-2xl border border-[#CBD5E1] px-4 py-3 outline-none focus:border-[#2563EB]"
                  placeholder="Full-time, Contract"
                />
              </label>
              <label className="space-y-2">
                <span className="font-bold text-[#0F172A]">Minimal salary</span>
                <input
                  value={form.min_salary}
                  onChange={(event) =>
                    updateField("min_salary", event.target.value)
                  }
                  type="number"
                  className="w-full rounded-2xl border border-[#CBD5E1] px-4 py-3 outline-none focus:border-[#2563EB]"
                  placeholder="8000000"
                />
              </label>
              <label className="space-y-2">
                <span className="font-bold text-[#0F172A]">
                  Remote preference
                </span>
                <input
                  value={form.remote_preference}
                  onChange={(event) =>
                    updateField("remote_preference", event.target.value)
                  }
                  className="w-full rounded-2xl border border-[#CBD5E1] px-4 py-3 outline-none focus:border-[#2563EB]"
                  placeholder="Remote, Hybrid, On-site"
                />
              </label>
              <label className="space-y-2">
                <span className="font-bold text-[#0F172A]">
                  Daily apply limit
                </span>
                <input
                  value={form.daily_apply_limit}
                  onChange={(event) =>
                    updateField("daily_apply_limit", event.target.value)
                  }
                  type="number"
                  className="w-full rounded-2xl border border-[#CBD5E1] px-4 py-3 outline-none focus:border-[#2563EB]"
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="font-bold text-[#0F172A]">
                  Preferred industries
                </span>
                <input
                  value={form.preferred_industries}
                  onChange={(event) =>
                    updateField("preferred_industries", event.target.value)
                  }
                  className="w-full rounded-2xl border border-[#CBD5E1] px-4 py-3 outline-none focus:border-[#2563EB]"
                  placeholder="Tech, Energy, Consulting"
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="font-bold text-[#0F172A]">
                  Blacklisted companies
                </span>
                <input
                  value={form.blacklisted_companies}
                  onChange={(event) =>
                    updateField("blacklisted_companies", event.target.value)
                  }
                  className="w-full rounded-2xl border border-[#CBD5E1] px-4 py-3 outline-none focus:border-[#2563EB]"
                  placeholder="Perusahaan yang ingin di-skip"
                />
              </label>
            </div>

            {message && (
              <div className="mt-6 rounded-2xl bg-slate-50 border border-[#E2E8F0] p-4 text-[#0F172A] font-medium">
                {message}
              </div>
            )}
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveLoading}
              className="mt-8 inline-flex items-center gap-2 bg-[#2563EB] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-[#1D4ED8] disabled:opacity-60"
            >
              <Save className="h-5 w-5" /> Simpan Preferensi
            </button>
          </section>

          <section className="bg-white rounded-3xl p-8 border border-[#E2E8F0] shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-[#2563EB]" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#0F172A]">
                    File CV yang diupload
                  </h2>
                  <p className="text-[#64748B]">
                    Semua file CV tersimpan dan hanya bisa dibuka saat login.
                  </p>
                </div>
              </div>
              <a
                href="/upload-cv"
                className="rounded-xl bg-[#2563EB] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-[#1D4ED8]"
              >
                Upload CV
              </a>
            </div>

            {cvError && (
              <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-red-700 font-medium">
                {cvError.message}
              </div>
            )}

            {loadingCVs ? (
              <div className="rounded-2xl border border-[#E2E8F0] p-6 text-center text-[#64748B]">
                Memuat file CV...
              </div>
            ) : cvs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#CBD5E1] p-8 text-center">
                <FileText className="h-10 w-10 text-[#2563EB] mx-auto mb-3" />
                <h3 className="text-lg font-black text-[#0F172A]">
                  Belum ada file CV
                </h3>
                <p className="text-[#64748B] mt-1">
                  Upload CV pertama untuk memulai screening ATS.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#E2E8F0] rounded-2xl border border-[#E2E8F0] overflow-hidden">
                {cvs.map((cv) => {
                  const score = cv.audit_result?.ats_score;
                  const fileName = cv.file_name || `CV #${cv.id}`;
                  return (
                    <div
                      key={cv.id}
                      className="p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 flex-shrink-0 text-[#2563EB]" />
                          <h3 className="truncate text-lg font-black text-[#0F172A]">
                            {fileName}
                          </h3>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3 text-sm text-[#64748B]">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-4 w-4" />
                            {formatDate(cv.created_at)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <HardDrive className="h-4 w-4" />
                            {formatBytes(cv.size_bytes)}
                          </span>
                          <span className="font-bold text-[#0F172A]">
                            ATS {typeof score === "number" ? `${score}%` : "belum ada"}
                          </span>
                        </div>
                      </div>
                      <a
                        href={cv.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#CBD5E1] px-4 py-3 text-sm font-bold text-[#0F172A] hover:border-[#2563EB] hover:text-[#2563EB]"
                      >
                        <Download className="h-4 w-4" />
                        Buka file
                      </a>
                    </div>
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
