"use client";

import { useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";

export function LoginForm({ ownerEmail }: { ownerEmail: string }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: formData.get("email") })
      });
      const result = (await response.json()) as { error?: string; redirect?: string };
      if (!response.ok) {
        setError(result.error || "无法建立登录会话。");
        return;
      }
      window.location.assign(result.redirect || "/app");
    } catch {
      setError("网络连接失败，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="login-panel">
      <div className="login-mark">
        <LockKeyhole size={20} aria-hidden />
      </div>
      <div>
        <h1>MyOS</h1>
        <p>未来玻璃 OS 入口，仅允许拥有者进入。</p>
      </div>
      <label>
        <span>拥有者邮箱</span>
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={ownerEmail}
          defaultValue={ownerEmail}
          required
        />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? "正在验证" : "进入工作台"}
        <ArrowRight size={16} aria-hidden />
      </button>
      <p className="login-note">
        第一版使用本地安全会话演示单用户保护。配置 Supabase 后，可切换为 Magic Link 或密码登录。
      </p>
    </form>
  );
}
