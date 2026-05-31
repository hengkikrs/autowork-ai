"use client";

import { useEffect, useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import { Save, Settings as SettingsIcon } from "lucide-react";

async function fetchPreferences() {
  const response = await fetch("/api/preferences");
  if (!response.ok) {
    throw new Error("Tidak bisa mengambil preferensi");
  }
  return response.json();
}

function splitText(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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
        </div>
      </main>
    </div>
  );
}
