"use client";

import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import { ClipboardList } from "lucide-react";

async function fetchApplications() {
  const response = await fetch("/api/applications");
  if (!response.ok) {
    throw new Error("Tidak bisa mengambil lamaran");
  }
  return response.json();
}

export default function ApplicationsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["applications"],
    queryFn: fetchApplications,
  });
  const applications = data?.applications || [];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Navigation />
      <main className="flex-1 ml-64 p-10">
        <div className="max-w-6xl mx-auto space-y-8">
          <header>
            <p className="text-sm font-bold text-[#2563EB] uppercase tracking-[0.2em]">
              Tracking
            </p>
            <h1 className="text-4xl font-extrabold text-[#0F172A] tracking-tight">
              Applications
            </h1>
            <p className="text-[#64748B] text-lg mt-2">
              Pantau status lamaran dari FOUND sampai APPLIED.
            </p>
          </header>

          {error && (
            <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-red-700 font-medium">
              {error.message}
            </div>
          )}

          <section className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-10 text-center text-[#64748B]">
                Memuat lamaran...
              </div>
            ) : applications.length === 0 ? (
              <div className="p-12 text-center">
                <ClipboardList className="h-12 w-12 text-[#2563EB] mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-[#0F172A]">
                  Belum ada lamaran
                </h2>
                <p className="text-[#64748B] mt-2">
                  Hitung match score dari halaman Jobs untuk mulai tracking.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#E2E8F0]">
                {applications.map((application) => {
                  const score = application.match_score || 0;
                  const status = application.status || "FOUND";
                  return (
                    <div
                      key={application.id}
                      className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div>
                        <h3 className="text-xl font-black text-[#0F172A]">
                          {application.company || "Unknown Company"} —{" "}
                          {application.title || "Untitled Role"}
                        </h3>
                        <p className="text-[#64748B] mt-1">
                          {application.source || "Manual"} ·{" "}
                          {application.location || "Lokasi belum tersedia"}
                        </p>
                        <p className="text-sm text-[#94A3B8] mt-2">
                          {application.notes || "Belum ada catatan"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-bold">
                          {score}%
                        </span>
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-bold">
                          {status}
                        </span>
                        {application.job_url && (
                          <a
                            href={application.job_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#2563EB] font-bold"
                          >
                            Open
                          </a>
                        )}
                      </div>
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
