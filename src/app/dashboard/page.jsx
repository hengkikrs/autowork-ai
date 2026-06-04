"use client";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Download,
  Loader2,
  ArrowRight,
  Bot,
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
  const queryClient = useQueryClient();
  const [autoProcessingCv, setAutoProcessingCv] = useState(false);
  const [autoProcessMode, setAutoProcessMode] = useState("");
  const [autoProcessError, setAutoProcessError] = useState("");
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
  const originalAtsScore = auditResult?.original_ats_score;
  const optimizedCvUrl = auditResult?.optimized_cv_url || cvData?.file_url;
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
  const needsMoreCvText = Boolean(auditResult?.needs_user_text);
  const needsCvImprovement = auditReady && atsScore < 87;
  const shouldAutoProcessCv =
    hasCv &&
    (!auditReady ||
      (needsCvImprovement &&
        !auditResult?.optimized_by_ai &&
        !needsMoreCvText));
  const aiCvStatus =
    autoProcessingCv && autoProcessMode === "screening"
      ? "AI sedang screening CV baru."
      : autoProcessingCv
        ? "AI sedang memperbaiki CV aktif."
        : !hasCv
          ? "Upload CV untuk mengaktifkan screening AI."
          : !auditReady
            ? "AI siap screening CV otomatis."
            : needsMoreCvText
              ? "AI butuh teks CV lebih lengkap sebelum auto-improve."
              : needsCvImprovement
                ? "AI akan memperbaiki CV karena skor di bawah 87%."
                : "CV sudah lolos target ATS.";
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
        : autoProcessingCv && autoProcessMode === "screening"
          ? "AI sedang membaca file dan menghitung skor ATS."
          : "AI akan parsing CV dan audit skor ATS otomatis.",
      icon: TrendingUp,
      state: getStepState(auditReady, activeStep === "screening"),
      href: "/dashboard",
    },
    {
      key: "improve",
      title: "Perbaiki CV",
      description: needsMoreCvText
        ? "Paste teks CV lengkap agar AI bisa rewrite dengan aman."
        : needsCvImprovement
        ? "Ikuti rekomendasi utama sebelum matching."
        : auditResult?.optimized_by_ai
          ? "CV sudah diperbaiki otomatis dan menjadi CV aktif."
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
  const aiAutomation = [
    {
      title: "CV Screening",
      description: auditReady
        ? `AI sudah menilai ATS ${atsScore}%.`
        : hasCv
          ? "AI screening berjalan otomatis di dashboard."
          : "Aktif setelah CV diupload.",
      icon: Bot,
    },
    {
      title: "Auto Improve",
      description: auditResult?.optimized_by_ai
        ? "CV aktif sudah diganti versi ATS."
        : needsCvImprovement
          ? needsMoreCvText
            ? "Butuh teks CV lengkap untuk rewrite aman."
            : "AI akan memperbaiki skor di bawah 87%."
          : "Tidak perlu rewrite saat skor sudah aman.",
      icon: Wand2,
    },
    {
      title: "Job Parser",
      description: hasJobs
        ? `${jobs.length} lowongan diproses dari job description.`
        : "Paste lowongan, AI akan parsing requirement.",
      icon: Search,
    },
    {
      title: "Match & Report",
      description: hasAnyMatch
        ? `${matchedJobs} lowongan cocok 70%+ masuk pipeline.`
        : "AI match score dan dokumen tailored mengisi report.",
      icon: BarChart3,
    },
  ];

  useEffect(() => {
    if (!shouldAutoProcessCv || autoProcessingCv) return;

    let cancelled = false;
    async function processCv() {
      setAutoProcessMode(!auditReady ? "screening" : "improving");
      setAutoProcessingCv(true);
      setAutoProcessError("");
      try {
        const response = await fetch("/api/cv/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cvId: cvData.id }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(
            body.error || "Tidak bisa menjalankan AI CV otomatis",
          );
        }
        if (!cancelled) {
          queryClient.invalidateQueries({ queryKey: ["cvs"] });
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setAutoProcessError(error.message);
        }
      } finally {
        if (!cancelled) {
          setAutoProcessingCv(false);
        }
      }
    }

    processCv();
    return () => {
      cancelled = true;
    };
  }, [
    shouldAutoProcessCv,
    auditReady,
    cvData?.id,
    queryClient,
  ]);

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

          <div className="space-y-8">
              <section className="bg-white p-6 rounded-3xl shadow-sm border border-[#E2E8F0]">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-[#0F172A]">
                      Progress apply kerja
                    </h2>
                    <p className="text-[#64748B]">
                      Alur step-by-step dari upload CV sampai report.
                    </p>
                    <div className="mt-3 inline-flex max-w-xl items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-[#1D4ED8]">
                      {autoProcessingCv ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                      <span>{aiCvStatus}</span>
                    </div>
                  </div>
                  <a
                    href="/upload-cv"
                    className="inline-flex items-center gap-2 text-[#2563EB] font-bold hover:text-[#1D4ED8]"
                  >
                    Update CV <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
                <div className="overflow-x-auto pb-2">
                  <div className="flex min-w-[1120px]">
                  {workflowSteps.map((step, index) => {
                    const Icon = step.icon;
                    const isLast = index === workflowSteps.length - 1;
                    const stateClass =
                      step.state === "completed"
                        ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
                        : step.state === "active"
                          ? "bg-blue-50 text-blue-950 ring-blue-200"
                          : "bg-white text-slate-700 ring-[#E2E8F0]";
                    const clipPath =
                      index === 0
                        ? "polygon(0 0, calc(100% - 24px) 0, 100% 50%, calc(100% - 24px) 100%, 0 100%)"
                        : isLast
                          ? "polygon(0 0, 100% 0, 100% 100%, 0 100%, 24px 50%)"
                          : "polygon(0 0, calc(100% - 24px) 0, 100% 50%, calc(100% - 24px) 100%, 0 100%, 24px 50%)";
                    return (
                      <a
                        key={step.key}
                        href={step.href}
                        style={{
                          clipPath,
                          marginLeft: index === 0 ? 0 : -14,
                          zIndex: workflowSteps.length - index,
                        }}
                        className={`relative min-h-[168px] flex-1 px-7 py-5 ring-1 ring-inset transition-all hover:bg-blue-50 hover:text-blue-950 hover:ring-[#2563EB] ${
                          index === 0 ? "pl-5" : "pl-10"
                        } ${stateClass}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-[#2563EB]">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <Icon className="h-5 w-5 text-[#2563EB]" />
                          </div>
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
                </div>
                {autoProcessError && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                    {autoProcessError}
                  </div>
                )}
              </section>

              <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {aiAutomation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="bg-white rounded-3xl border border-[#E2E8F0] p-5 shadow-sm"
                    >
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50">
                        <Icon className="h-5 w-5 text-[#2563EB]" />
                      </div>
                      <h3 className="font-black text-[#0F172A]">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[#64748B]">
                        {item.description}
                      </p>
                    </div>
                  );
                })}
              </section>

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
                <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E2E8F0]">
                  <p className="text-sm font-bold text-[#64748B]">ATS Score</p>
                  <p className="text-4xl font-black text-[#0F172A] mt-2">
                    {atsScore}%
                  </p>
                  {typeof originalAtsScore === "number" && originalAtsScore !== atsScore && (
                    <p className="text-xs font-bold text-emerald-700 mt-2">
                      Dari {originalAtsScore}% setelah auto-improve
                    </p>
                  )}
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
                    {atsScore >= 87
                      ? "sudah kuat untuk ATS."
                      : "masih perlu ditingkatkan."}
                  </p>
                  {autoProcessingCv && (
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-[#2563EB]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {autoProcessMode === "screening"
                        ? "Screening CV otomatis"
                        : "Memperbaiki CV otomatis"}
                    </div>
                  )}
                  {needsMoreCvText && (
                    <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                      AI belum bisa rewrite otomatis karena teks CV yang terbaca
                      belum lengkap.
                    </div>
                  )}
                  {optimizedCvUrl && (
                    <a
                      href={optimizedCvUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-[#1D4ED8]"
                    >
                      <Download className="h-4 w-4" />
                      Download CV ATS terbaru
                    </a>
                  )}
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
                </>
              )}
            </div>
        </div>
      </main>
    </div>
  );
}
