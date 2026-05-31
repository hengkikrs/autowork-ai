import useAuth from "@/utils/useAuth";
import { useEffect } from "react";

function LogoutPage() {
  const { signOut } = useAuth();

  useEffect(() => {
    signOut({ callbackUrl: "/", redirect: true });
  }, [signOut]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#F8FAFC] font-sans">
      <div className="text-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#2563EB] border-t-transparent mx-auto"></div>
        <p className="text-lg font-medium text-[#64748B]">Signing you out...</p>
      </div>
    </div>
  );
}

export default LogoutPage;
