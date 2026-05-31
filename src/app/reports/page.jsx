"use client";

import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import { Download, PieChart } from "lucide-react";

async function fetchDailyReport() {
  const response = await fetch("/api/reports/daily");
  if (!response.ok) {
    throw new Error("Tidak bisa mengambil laporan harian");
  }
  return response.json();
}

export default function ReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["daily-report"],
    queryFn: fetchDailyReport,
  });
  const summary = data?.summary || {};
  const applications = data?.applications || [];
  const cards = [
    ["Lowongan ditemukan", summary.found || 0],
    ["Cocok", summary.matched || 0],
    ["CV tailored", summary.tailored || 0],
    ["Cover letter", summary.cover_letters || 0],
    ["Applied", summary.applied || 0],
    ["Pending approval", summary.pending || 0],
    ["Gagal", summary.failed || 0],
  ];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Navigation />
      <main className="flex-1 ml-64 p-10">
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#2563EB] uppercase tracking-[0.2em]">
                Daily Report
              </p>
              <h1 className="text-4xl font-extrabold text-[#0F172A] tracking-tight">
                Reports
              </h1>
              <p className="text-[#64748B] text-lg mt-2">
                Ringkasan progres apply kerja hari ini.
              </p>
            </div>
            <button className="inline-flex items-center gap-2 bg-white border border-[#CBD5E1] text-[#0F172A] px-5 py-3 rounded-xl font-bold">
              <Download className="h-5 w-5" /> Export nanti
            </button>
          </header>

          {isLoading ? (
            <div className="bg-white rounded-3xl p-10 border border-[#E2E8F0] text-center text-[#64748B]">
              Memuat laporan...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {cards.map(([label, value]) => (
                  <div
                    key={label}
                    className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-sm"
                  >
                    <p className="text-sm font-bold text-[#64748B]">{label}</p>
                    <p className="text-4xl font-black text-[#0F172A] mt-2">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <section className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[#E2E8F0] flex items-center gap-3">
                  <PieChart className="h-6 w-6 text-[#2563EB]" />
                  <h2 className="text-2xl font-bold text-[#0F172A]">
                    Detail hari ini
                  </h2>
                </div>
                {applications.length === 0 ? (
                  <div className="p-10 text-center text-[#64748B]">
                    Belum ada aktivitas apply hari ini.
                  </div>
                ) : (
                  <div className="divide-y divide-[#E2E8F0]">
                    {applications.map((item) => (
                      <div
                        key={item.id}
                        className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div>
                          <p className="font-black text-[#0F172A]">
                            {item.company} — {item.title}
                          </p>
                          <p className="text-[#64748B]">
                            {item.source || "Manual"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-bold">
                            {item.match_score || 0}%
                          </span>
                          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-bold">
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
