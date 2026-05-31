import { useState } from "react";
import useAuth from "@/utils/useAuth";

function SignInPage() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { signInWithCredentials } = useAuth();

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      await signInWithCredentials({
        email,
        password,
        callbackUrl: "/dashboard",
        redirect: true,
      });
    } catch (err) {
      setError(err.message || "Invalid credentials. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#F8FAFC] p-4 font-sans text-[#1E293B]">
      <form
        noValidate
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-3xl bg-white p-10 shadow-2xl border border-[#E2E8F0]"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-[#0F172A] mb-2 tracking-tight">
            AutoWork AI
          </h1>
          <p className="text-[#64748B]">Welcome back! Sign in to continue</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#475569]">
              Email
            </label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-lg outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6] focus:ring-opacity-20 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#475569]">
              Password
            </label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-lg outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6] focus:ring-opacity-20 transition-all"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-[#FEF2F2] p-4 text-sm text-[#DC2626] border border-[#FECACA]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#2563EB] px-4 py-4 text-lg font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-[#1D4ED8] hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <p className="text-center text-sm text-[#64748B]">
            Don't have an account?{" "}
            <a
              href="/account/signup"
              className="font-bold text-[#2563EB] hover:underline"
            >
              Join AutoWork AI
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}

export default SignInPage;
