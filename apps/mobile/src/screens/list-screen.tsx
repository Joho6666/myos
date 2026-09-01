import { Check } from "lucide-react";
import type { MobileInbox, MobileProject, MobileTask } from "../data";

type Row = MobileTask | MobileInbox | MobileProject;

export function ListScreen({
  title,
  rows,
  kind,
  onToggleTask
}: {
  title: string;
  rows: Row[];
  kind: "task" | "inbox" | "project";
  onToggleTask?: (task: MobileTask) => void;
}) {
  return (
    <section className="list">
      <h2>{title}</h2>
      {rows.length ? rows.map((row) => {
        const task = kind === "task" ? row as MobileTask : null;
        const done = task?.status === "completed";
        return (
          <article key={row.id} className={done ? "done" : undefined}>
            {kind === "task" && task ? (
              <button className={done ? "check done" : "check"} type="button" aria-label={done ? "标为未完成" : "完成任务"} onClick={() => onToggleTask?.(task)}>
                <Check size={16} />
              </button>
            ) : null}
            <div>
              <strong>{"title" in row ? row.title : row.name}</strong>
              <small>
                {kind === "task" ? (row as MobileTask).priority : kind === "inbox" ? (row as MobileInbox).category : (row as MobileProject).nextAction}
              </small>
            </div>
          </article>
        );
      }) : <div className="empty">还没有内容。用上方输入框记录第一项。</div>}
    </section>
  );
}
