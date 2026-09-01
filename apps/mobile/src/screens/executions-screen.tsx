import { Timer } from "lucide-react";
import type { MobileExecution } from "../data";

export function ExecutionsScreen({ executions, online }: { executions: MobileExecution[]; online: boolean }) {
  return (
    <section className="list">
      <h2>执行状态</h2>
      <p className="hint">手机只缓存桌面 Agent 的结果。审批和 Codex 仍在电脑上的 MyOS Runtime 运行。</p>
      {executions.length ? executions.map((item) => (
        <article key={item.id}>
          <div>
            <strong>{item.title}</strong>
            <small>{item.projectName || "未关联项目"} · {item.agentId} · {item.status}</small>
            {item.error ? <small>{item.error}</small> : null}
          </div>
        </article>
      )) : <div className="empty">{online ? "还没有执行记录。" : "离线显示上次缓存。联网后会刷新。"}</div>}
      <button className="ghost" type="button" disabled>
        <Timer size={16} /> 批准需电脑 Runtime 在线
      </button>
    </section>
  );
}
