import { Bell, BookOpen, FileText, LayoutDashboard, MessageSquareText, Play, ScrollText, Search, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/submissions", label: "Subs", icon: FileText },
  { to: "/rubric", label: "Rubric", icon: BookOpen },
  { to: "/reports", label: "Reports", icon: ScrollText },
  { to: "/feedbacks", label: "Feedback", icon: MessageSquareText },
  { to: "/run", label: "Run", icon: Play },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function TopBar() {
  return (
    <>
      <header className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-4 shadow-soft lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Automated Assignment Grader</p>
          <h1 className="mt-1 text-xl font-semibold text-balance">Local grader control panel</h1>
        </div>

        <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
          <Button variant="outline" size="icon" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-border bg-card px-3 py-3 shadow-soft lg:hidden">
        {mobileNavItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                isActive ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-foreground",
              )
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
