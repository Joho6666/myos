"use client";

import { useActionState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm({ ownerEmail }: { ownerEmail: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="login-panel">
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
      <label>
        <span>访问口令</span>
        <input
          name="accessCode"
          type="password"
          autoComplete="current-password"
          placeholder="配置了 MYOS_ACCESS_CODE 时必填"
        />
      </label>
      {state.error ? <p className="form-error">{state.error}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? "正在验证" : "进入工作台"}
        <ArrowRight size={16} aria-hidden />
      </button>
      <p className="login-note">
        本机访问只需邮箱；远程访问需要在服务端配置 MYOS_ACCESS_CODE 并输入对应口令。
      </p>
    </form>
  );
}
