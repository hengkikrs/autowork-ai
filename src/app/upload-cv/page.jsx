"use client";
import { useState, useCallback } from "react";
import useUpload from "@/utils/useUpload";
import Navigation from "@/components/Navigation";
import {
  Upload as UploadIcon,
  FileText,
  AlertCircle,
  Loader2,
} from "lucide-react";

async function extractPdfTextIfAvailable(file) {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf || typeof window === "undefined") {
    return "";
  }

  try {
    const { extractTextFromPDF } = await import("@/client-integrations/pdfjs");
    return (await extractTextFromPDF(file)) || "";
  } catch (error) {
    console.warn("PDF text extraction failed:", error);
    return "";
  }
}

export default function UploadCVPage() {
  const [upload, { loading: uploading }] = useUpload();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [rawTextInput, setRawTextInput] = useState("");

  const handleFileUpload = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);
      try {
        const allowedTypes = [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];
        const allowedExtension =
          file.name.toLowerCase().endsWith(".pdf") ||
          file.name.toLowerCase().endsWith(".docx");
        const maxSize = 4 * 1024 * 1024;

        if (!allowedTypes.includes(file.type) && !allowedExtension) {
          setError("Format file harus PDF atau DOCX.");
          return;
        }

        if (file.size > maxSize) {
          setError("Ukuran file maksimal 4MB.");
          return;
        }

        setProcessing(true);
        const extractedText = await extractPdfTextIfAvailable(file);
        const rawText = rawTextInput.trim()
          ? rawTextInput.trim()
          : extractedText?.trim()
            ? extractedText.trim()
            : `File uploaded: ${file.name}. User has not pasted CV text yet, so extract only safe metadata and mark missing sections clearly.`;

        const { url, error: uploadError } = await upload({ file });
        if (uploadError) throw new Error(uploadError);
        if (!url) throw new Error("Upload berhasil tapi URL file tidak tersedia.");

        const saveRes = await fetch("/api/cv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileUrl: url, rawText }),
        });
        if (!saveRes.ok) {
          throw new Error("Tidak bisa menyimpan CV");
        }
        const { cv } = await saveRes.json();

        const processRes = await fetch("/api/cv/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cvId: cv.id }),
        });
        if (!processRes.ok) {
          throw new Error("Tidak bisa memproses CV");
        }

        if (typeof window !== "undefined") {
          window.location.href = "/dashboard";
        }
      } catch (err) {
        console.error(err);
        setError(err?.message || "Gagal upload atau proses CV. Coba lagi ya.");
      } finally {
        setProcessing(false);
      }
    },
    [upload, rawTextInput],
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Navigation />

      <main className="flex-1 ml-64 p-10">
        <div className="max-w-4xl mx-auto">
          <header className="mb-10">
            <h1 className="text-4xl font-extrabold text-[#0F172A] mb-2 tracking-tight">
              Upload your CV
            </h1>
            <p className="text-[#64748B] text-lg">
              We'll analyze your CV for ATS compatibility and start finding jobs
              for you.
            </p>
          </header>

          <div className="bg-white rounded-3xl p-12 border-2 border-dashed border-[#CBD5E1] flex flex-col items-center justify-center text-center transition-all hover:border-[#2563EB] group">
            <div className="h-20 w-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <UploadIcon className="h-10 w-10 text-[#2563EB]" />
            </div>

            <h2 className="text-2xl font-bold text-[#1E293B] mb-2">
              Drag and drop your CV here
            </h2>
            <p className="text-[#64748B] mb-8">Support PDF, DOCX (Max 4MB)</p>

            <label className="cursor-pointer bg-[#2563EB] text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-[#1D4ED8] transition-all inline-flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Choose File</span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx"
                onChange={handleFileUpload}
                disabled={uploading || processing}
              />
            </label>

            <div className="mt-8 w-full text-left">
              <label className="block text-sm font-bold text-[#0F172A] mb-2">
                Paste isi CV di sini agar parsing AI lebih akurat (opsional tapi
                direkomendasikan)
              </label>
              <textarea
                value={rawTextInput}
                onChange={(event) => setRawTextInput(event.target.value)}
                rows={8}
                placeholder="Copy-paste teks dari CV kamu di sini..."
                className="w-full rounded-2xl border border-[#CBD5E1] px-4 py-3 outline-none focus:border-[#2563EB] text-left"
                disabled={uploading || processing}
              />
              <p className="text-sm text-[#64748B] mt-2">
                Untuk MVP ini, paste teks membantu AI membaca CV dengan benar
                sambil file tetap disimpan.
              </p>
            </div>

            {(uploading || processing) && (
              <div className="mt-10 flex items-center space-x-3 text-[#2563EB] font-bold">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>
                  {uploading
                    ? "Uploading CV..."
                    : "AI is analyzing your profile..."}
                </span>
              </div>
            )}

            {error && (
              <div className="mt-8 flex items-center space-x-2 text-[#DC2626] bg-red-50 px-4 py-2 rounded-lg border border-red-100">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
