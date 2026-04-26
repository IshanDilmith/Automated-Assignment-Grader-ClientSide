import { Outlet } from "react-router-dom";
import { SidebarNav } from "./sidebar-nav";
import { TopBar } from "./top-bar";

export function AppShell() {
  return (
    <div className="min-h-full bg-[linear-gradient(180deg,rgba(255,255,255,0.76),rgba(255,255,255,0.94))]">
      <div className="mx-auto flex min-h-full max-w-[1600px] gap-6 px-4 py-4 md:px-6">
        <aside className="hidden w-72 shrink-0 lg:block">
          <SidebarNav />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <TopBar />
          <main className="min-w-0 flex-1 pb-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
