import { getOwnerEmail } from "@/lib/auth/session";
import { LoginForm } from "./login-form";
import "./styles.css";

export default function LoginPage() {
  const ownerEmail = getOwnerEmail();

  return (
    <main className="login-page">
      <section className="login-copy" aria-labelledby="login-heading">
        <p className="login-kicker">Personal Digital OS</p>
        <h2 id="login-heading">把你的 AI、项目、文件、自动化和知识收进一个私人操作系统。</h2>
        <ul>
          <li><strong>Today Console</strong><span>只显示今天真正相关的任务和入口。</span></li>
          <li><strong>Command Center</strong><span>用 Ctrl + K 搜索、跳转、创建和运行。</span></li>
          <li><strong>Private Backend</strong><span>Supabase 本地表保护你的私人数据。</span></li>
        </ul>
        <div className="login-orbit" aria-hidden>
          <span>AI</span>
          <span>n8n</span>
          <span>Files</span>
        </div>
      </section>
      <LoginForm ownerEmail={ownerEmail} />
    </main>
  );
}
