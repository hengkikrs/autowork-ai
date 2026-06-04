import {
  Home,
  Upload,
  Briefcase,
  ClipboardList,
  PieChart,
  Settings,
  LogOut,
  Mail,
  Bot,
} from "lucide-react";
import useUser from "@/utils/useUser";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/ai", icon: Bot, label: "AI Assistant" },
  { href: "/upload-cv", icon: Upload, label: "Upload CV" },
  { href: "/jobs", icon: Briefcase, label: "Jobs" },
  { href: "/applications", icon: ClipboardList, label: "Applications" },
  { href: "/reports", icon: PieChart, label: "Reports" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function Navigation() {
  const { data: user } = useUser();
  // Using window.location.pathname for active state
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "";

  return (
    <div className="flex h-screen w-64 flex-col bg-[#0F172A] text-white fixed left-0 top-0">
      <div className="px-6 py-8">
        <div className="text-2xl font-black tracking-tight">AutoWork AI</div>
        <div className="text-xs text-[#94A3B8] mt-1">
          Job Application Assistant
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                isActive
                  ? "bg-[#2563EB] text-white shadow-lg shadow-blue-500/20"
                  : "text-[#94A3B8] hover:bg-[#1E293B] hover:text-white"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#1E293B]">
        {user?.email && (
          <div className="mb-2 flex items-center space-x-3 rounded-xl px-4 py-2 text-xs font-medium text-[#CBD5E1]">
            <Mail className="h-4 w-4 text-[#94A3B8]" />
            <span className="truncate" title={user.email}>
              {user.email}
            </span>
          </div>
        )}
        <a
          href="/account/logout"
          className="flex items-center space-x-3 rounded-xl px-4 py-3 text-sm font-medium text-[#94A3B8] hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </a>
      </div>
    </div>
  );
}
