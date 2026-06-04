"use client";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import {
  FileText,
  TrendingUp,
  Star,
  Briefcase,
  ClipboardList,
  Settings,
  CheckCircle2,
  Circle,
  Clock,
  Search,
  Wand2,
  Send,
  BarChart3,
} from "lucide-react";

async function fetchCVs() {
  const response = await fetch("/api/cv");
  if (!response.ok) {
    throw new Error("Tidak bisa mengambil CV");
  }
  return response.json();
}

async function fetchJobs() {
  const response = await fetch("/api/jobs");
  if (!response.ok) {
    throw new Error("Tidak bisa mengambil jobs");
  }
  return response.json();
}

async function fetchApplications() {
  const response = await fetch("/api/applications");
  if (!response.ok) {
    throw new Error("Tidak bisa mengambil applications");
  }
  return response.json();
}

function getStepState(done, active) {
  if (done) return "completed";
  if (active) return "active";
  return "waiting";
}

function StepIcon({ state }) {
  if (state === "completed") {
    return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
  }
  if (state === "active") {
    return <Clock className="h-5 w-5 text-[#2563EB]" />;
  }
  return <Circle className="h-5 w-5 text-[#94A3B8]" />;
}

export default function DashboardPage() {
  const { data: cvResponse, isLoading: loadingCV } = useQuery({
    queryKey: ["cvs"],
    queryFn: fetchCVs,
  });
  const { data: jobResponse, isLoading: loadingJobs } = useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs,
  });
  const { data: applicationResponse, isLoading: loadingApplications } =
    useQuery({ queryKey: ["applications"], queryFn: fetchApplications });

  const cvData = cvResponse?.cvs?.[0] || null;
  const jobs = jobResponse?.jobs || [];
  const applications = applicationResponse?.applications || [];
  const loading = loadingCV || loadingJobs || loadingApplications;
  const auditResult = cvData?.audit_result || {};
  const atsScore = auditResult?.ats_score || 0;
  const recommendations = auditResult?.recommendations || [];
  const auditReady = Object.keys(auditResult || {}).length > 0;
  const hasCv = Boolean(cvData);
  const hasJobs = jobs.length > 0;
  const hasAnyMatch = jobs.some((job) => job.match_score !== null && job.match_score !== undefined);
  const matchedJobs = jobs.filter((job) => job.match_score >= 70).length;
  const pendingApplications = applications.filter(
    (application) => application.status === "WAITING_USER_APPROVAL",
  ).length;
  const hasTailoredDocument = applications.some((application) =>
    ["TAILORED_CV_READY", "COVER_LETTER_READY", "WAITING_USER_APPROVAL"].includes(
      application.status,
    ) || application.tailored_cv_url || application.cover_letter_url,
  );
  const hasApplyActivity = applications.some((application) =>
    [
      "WAITING_USER_APPROVAL",
      "NEEDS_MANUAL_ACTION",
      "TAILORED_CV_READY",
      "COVER_LETTER_READY",
      "APPLIED",
    ].includes(application.status),
  );
  const hasReportData = applications.length > 0;
  const needsCvImprovement = auditReady && atsScore < 75;
  const activeStep =
    !hasCv
      ? "upload"
      : !auditReady
        ? "screening"
        : needsCvImprovement
          ? "improve"
          : !hasJobs
            ? "jobs"
            : !hasAnyMatch
              ? "match"
              : !hasTailoredDocument
                ? "tailor"
                : !hasApplyActivity
                  ? "apply"
                  : "report";
  const workflowSteps = [
    {
      key: "upload",
      title: "Upload CV",
      description: hasCv
        ? `CV #${cvData.id} sudah tersimpan.`
        : "Upload PDF atau DOCX untuk memulai.",
      icon: FileText,
      state: getStepState(hasCv, activeStep === "upload"),
      href: "/upload-cv",
    },
    {
      key: "screening",
      title: "Screening CV ATS",
      description: auditReady
        ? `Audit selesai dengan skor ${atsScore}%.`
        : "Menunggu hasil parsing dan audit ATS.",
      icon: TrendingUp,
      state: getStepState(auditReady, activeStep === "screening"),
      href: "/dashboard",
    },
    {
      key: "improve",
      title: "Perbaiki CV",
      description: needsCvImprovement
        ? "Ikuti rekomendasi utama sebelum matching."
        : auditReady
          ? "CV sudah cukup untuk mulai matching."
          : "Rekomendasi muncul setelah screening.",
      icon: Wand2,
      state: getStepState(auditReady && !needsCvImprovement, activeStep === "improve"),
      href: "/dashboard",
    },
    {
      key: "jobs",
      title: "Cari lowongan sesuai",
      description: hasJobs
        ? `${jobs.length} lowongan sudah tersedia.`
        : "Tambah lowongan atau job description target.",
      icon: Search,
      state: getStepState(hasJobs, activeStep === "jobs"),
      href: "/jobs",
    },
    {
      key: "tailor",
      title: "Sesuaikan CV dengan lowongan",
      description: hasTailoredDocument
        ? "Tailored CV atau cover letter sudah dibuat."
        : hasAnyMatch
          ? "Pilih lowongan cocok lalu buat dokumen tailored."
          : "Hitung match score untuk menentukan prioritas.",
      icon: Briefcase,
      state: getStepState(hasTailoredDocument, activeStep === "match" || activeStep === "tailor"),
      href: "/jobs",
    },
    {
      key: "apply",
      title: "Apply",
      description: hasApplyActivity
        ? `${applications.length} lamaran masuk tracking.`
        : "Siapkan dokumen dan submit manual dengan aman.",
      icon: Send,
      state: getStepState(hasApplyActivity, activeStep === "apply"),
      href: "/applications",
    },
    {
      key: "report",
      title: "Report",
      description: hasReportData
        ? "Ringkasan lamaran siap dilihat."
        : "Report aktif setelah ada tracking lamaran.",
      icon: BarChart3,
      state: getStepState(hasReportData, activeStep === "report"),
      href: "/reports",
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#F8FAFC] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Navigation />

      <main className="flex-1 ml-64 p-10">
        <div className="max-w-6xl mx-auto">
          <header className="flex justify-between items-center mb-10">
            <div>
              <p className="text-sm font-bold text-[#2563EB] uppercase tracking-[0.2em]">
                AutoWork AI
              </p>
              <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
                Dashboard Apply Kerja
              </h1>
              <p className="text-[#64748B]">
                Pantau CV, job matching, dan progres lamaran dari satu tempat.
              </p>
            </div>
            <a
              href="/upload-cv"
              className="bg-[#2563EB] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-[#1D4ED8] transition-all"
            >
              Update CV
            </a>
          </header>

          {!cvData ? (
            <div className="bg-white p-12 rounded-3xl text-center shadow-xl border border-[#E2E8F0]">
              <div className="h-20 w-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="h-10 w-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-[#1E293B] mb-4">
                Belum ada CV
              </h2>
              <p className="text-[#64748B] mb-8 max-w-md mx-auto">
                Upload CV untuk mulai audit ATS, parse profil, dan matching
                lowongan.
              </p>
              <a
                href="/upload-cv"
                className="inline-block bg-[#2563EB] text-white px-10 py-4 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-[#1D4ED8] transition-all"
              >
                Mulai Upload
              </a>
            </div>
          ) : (
            <div className="space-y-8">
              <section className="bg-white p-6 rounded-3xl shadow-sm border border-[#E2E8F0]">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-[#0F172A]">
                      Progress apply kerja
                    </h2>
                    <p className="text-[#64748B]">
                      Alur kerja dari upload CV sampai laporan lamaran.
                    </p>
                  </div>
                  <a
                    href="/upload-cv"
                    className="text-[#2563EB] font-bold hover:text-[#1D4ED8]"
                  >
                    Update CV
                  </a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                  {workflowSteps.map((step) => {
                    const Icon = step.icon;
                    const stateClass =
                      step.state === "completed"
                        ? "border-emerald-200 bg-emerald-50"
                        : step.state === "active"
                          ? "border-blue-200 bg-blue-50"
                          : "border-[#E2E8F0] bg-white";
                    return (
                      <a
                        key={step.key}
                        href={step.href}
                        className={`min-h-40 rounded-2xl border p-4 transition-all hover:border-[#2563EB] ${stateClass}`}
                      >
                        <div className="flex items-center justify-between">
                          <Icon className="h-5 w-5 text-[#2563EB]" />
                          <StepIcon state={step.state} />
                        </div>
                        <h3 className="mt-4 text-sm font-black text-[#0F172A] leading-snug">
                          {step.title}
                        </h3>
                        <p className="mt-2 text-xs text-[#64748B] leading-relaxed">
                          {step.description}
                        </p>
                      </a>
                    );
                  })}
                </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E2E8F0]">
                  <p className="text-sm font-bold text-[#64748B]">ATS Score</p>
                  <p className="text-4xl font-black text-[#0F172A] mt-2">
                    {atsScore}%
                  </p>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E2E8F0]">
                  <p className="text-sm font-bold text-[#64748B]">Lowongan</p>
                  <p className="text-4xl font-black text-[#0F172A] mt-2">
                    {jobs.length}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E2E8F0]">
                  <p className="text-sm font-bold text-[#64748B]">Cocok 70%+</p>
                  <p className="text-4xl font-black text-[#0F172A] mt-2">
                    {matchedJobs}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E2E8F0]">
                  <p className="text-sm font-bold text-[#64748B]">
                    Pending Approval
                  </p>
                  <p className="text-4xl font-black text-[#0F172A] mt-2">
                    {pendingApplications}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-white p-8 rounded-3xl shadow-sm border border-[#E2E8F0] flex flex-col items-center justify-center text-center">
                  <div className="relative h-40 w-40 mb-6 flex items-center justify-center rounded-full bg-blue-50">
                    <span className="text-4xl font-black text-[#1E293B]">
                      {atsScore}%
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-[#1E293B]">
                    Kesehatan CV
                  </h3>
                  <p className="text-[#64748B] text-center mt-2 text-sm">
                    CV kamu{" "}
                    {atsScore > 70
                      ? "sudah cukup kuat."
                      : "masih perlu ditingkatkan."}
                  </p>
                </div>

                <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-[#E2E8F0]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-[#1E293B]">
                      Rekomendasi Utama
                    </h3>
                    <TrendingUp className="text-blue-600 h-6 w-6" />
                  </div>
                  <div className="space-y-4">
                    {recommendations.slice(0, 3).map((rec) => (
                      <div
                        key={rec}
                        className="flex items-start space-x-3 p-4 bg-blue-50 rounded-2xl"
                      >
                        <Star className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                        <p className="text-[#1E293B] font-medium">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <a
                  href="/settings"
                  className="bg-white p-6 rounded-3xl border border-[#E2E8F0] hover:border-[#2563EB] transition-all"
                >
                  <Settings className="h-7 w-7 text-[#2563EB] mb-4" />
                  <h3 className="font-black text-[#0F172A]">Atur Preferensi</h3>
                  <p className="text-[#64748B] mt-1">
                    Target role, lokasi, gaji, dan blacklist.
                  </p>
                </a>
                <a
                  href="/jobs"
                  className="bg-white p-6 rounded-3xl border border-[#E2E8F0] hover:border-[#2563EB] transition-all"
                >
                  <Briefcase className="h-7 w-7 text-[#2563EB] mb-4" />
                  <h3 className="font-black text-[#0F172A]">Tambah Lowongan</h3>
                  <p className="text-[#64748B] mt-1">
                    Paste job description dan hitung match.
                  </p>
                </a>
                <a
                  href="/applications"
                  className="bg-white p-6 rounded-3xl border border-[#E2E8F0] hover:border-[#2563EB] transition-all"
                >
                  <ClipboardList className="h-7 w-7 text-[#2563EB] mb-4" />
                  <h3 className="font-black text-[#0F172A]">Track Lamaran</h3>
                  <p className="text-[#64748B] mt-1">
                    Lihat status dan catatan proses apply.
                  </p>
                </a>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
