export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center px-6">
      <div className="max-w-3xl text-center">
        <p className="text-sm font-bold text-blue-300 uppercase tracking-[0.25em] mb-4">
          AutoWork AI
        </p>
        <h1 className="text-5xl font-black tracking-tight mb-6">
          AI Job Application Assistant
        </h1>
        <p className="text-lg text-[#CBD5E1] mb-8">
          Upload CV, audit ATS, parse lowongan, hitung match score, buat
          tailored CV, dan track proses apply dengan mode manual assist yang
          aman.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/dashboard"
            className="bg-[#2563EB] text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-blue-900/30 hover:bg-[#1D4ED8] transition-all"
          >
            Masuk Dashboard
          </a>
          <a
            href="/account/signin"
            className="bg-white/10 text-white px-8 py-4 rounded-xl font-bold border border-white/20 hover:bg-white/20 transition-all"
          >
            Sign In
          </a>
        </div>
      </div>
    </div>
  );
}
