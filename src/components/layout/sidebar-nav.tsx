import { Link, NavLink } from "react-router-dom";
import { BookOpen, LayoutDashboard, MessageSquareText, Settings, Sparkles, FileText, Play, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/submissions", label: "Submissions", icon: FileText },
  { to: "/rubric", label: "Rubric", icon: BookOpen },
  { to: "/reports", label: "Reports", icon: ScrollText },
  { to: "/feedbacks", label: "Feedbacks", icon: MessageSquareText },
  { to: "/run", label: "Run grader", icon: Play },
  { to: "/logs", label: "Logs", icon: ScrollText },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function SidebarNav() {
  return (
    <div className="sticky top-4 flex h-[calc(100vh-2rem)] flex-col rounded-2xl border border-border bg-card p-4 shadow-soft">
      <Link to="/" className="flex items-center gap-3 px-1 py-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold">Assignment Grader</div>
          <div className="text-xs text-muted-foreground">Instructor control panel</div>
        </div>
      </Link>

      <nav className="mt-6 grid gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-muted",
              )
            }
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-xl border border-dashed border-border bg-muted/40 p-4">
        <div className="text-sm font-semibold">Backend ready</div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Start the local API bridge and the UI will read submissions, rubric data, reports, and logs straight from the grader.
        </p>
      </div>
    </div>
  );
}
