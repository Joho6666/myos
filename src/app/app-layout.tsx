import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { BackendStatusBanner } from "@/components/layout/backend-status-banner";
import { CreationCenterProvider } from "@/features/creation/creation-center-provider";

export function AppLayout({ children, email, timeZone = "Asia/Shanghai" }: { children: React.ReactNode; email: string; timeZone?: string }) {
  return (
    <CreationCenterProvider timeZone={timeZone}><div className="app-shell">
      <a className="skip-link" href="#main-content">
        跳到主内容
      </a>
      <Sidebar />
      <div className="main-shell">
        <Topbar email={email} />
        <main className="content" id="main-content">
          <BackendStatusBanner />
          {children}
        </main>
        <MobileNavigation />
      </div>
    </div></CreationCenterProvider>
  );
}
