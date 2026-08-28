"use client";

import Link from "next/link";
import { ArrowRight, Plus, Search, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { actionRegistry } from "@/features/actions/registry";
import { useMyOSData } from "@/lib/data/store";
import { searchMyOS } from "@/features/search/search";
import { parseCreationIntent } from "@/features/creation/parse-creation-intent";
import { useCreationCenter } from "@/features/creation/creation-context";

export function CommandPalette() {
  const { data } = useMyOSData();
  const { openCreation } = useCreationCenter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const results = searchMyOS(data, query);
  const normalizedQuery = query.trim().toLowerCase();
  const captureIntent = parseCreationIntent(query, data.projects);
  const quickActions = actionRegistry
    .filter((action) => action.enabled)
    .filter((action) =>
      !normalizedQuery ||
      `${action.label} ${action.description} ${action.keywords.join(" ")}`.toLowerCase().includes(normalizedQuery)
    )
    .slice(0, normalizedQuery ? 8 : 6);
  const recentResults = searchMyOS(data, "").slice(0, 5);

  function openFromCommand() { setOpen(false); openCreation({ type: captureIntent?.type || undefined, text: query }); }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button className="command-trigger" onClick={() => setOpen(true)} type="button">
        <Search size={17} aria-hidden />
        <span>输入命令或搜索内容...</span>
        <span className="kbd">Ctrl + K</span>
      </button>
      {open ? (
        <div className="command-overlay" role="presentation" onMouseDown={() => setOpen(false)}>
          <div className="command-panel" role="dialog" aria-modal="true" aria-label="全局命令面板" onMouseDown={(event) => event.stopPropagation()}>
            <div className="command-input-wrap">
              <Sparkles size={18} aria-hidden />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索，或输入：项目 / 任务 / 收件箱 / AI..." />
              <span className="command-mode">MyOS</span>
            </div>
            <div className="command-results">
              {captureIntent ? (
                <div className="command-section">
                  <div className="command-section-title">快速捕获</div>
                  <button className="command-result command-action command-button" type="button" onClick={openFromCommand}>
                    <span>
                      <strong>{captureIntent.type ? `创建${captureIntent.type === "project" ? "项目" : captureIntent.type === "task" ? "任务" : "想法"}：${captureIntent.title}` : "打开创建中心确认"}</strong>
                      <div className="row-subtitle">
                        先确认识别结果，再写入 MyOS
                      </div>
                    </span>
                    <Plus size={15} aria-hidden />
                  </button>
                </div>
              ) : null}
              <div className="command-section">
                <div className="command-section-title">快速动作</div>
                {quickActions.length ? quickActions.map((action) => (
                  action.type === "create" && ["create-project", "create-task", "capture-inbox"].includes(action.id) ? (
                    <button className="command-result command-action command-button" type="button" key={action.id} onClick={() => { setOpen(false); openCreation({ type: action.id === "create-project" ? "project" : action.id === "create-task" ? "task" : "inbox" }); }}>
                      <span><strong>{action.label}</strong><div className="row-subtitle">{action.group} / {action.description}</div></span><Plus size={15} aria-hidden />
                    </button>
                  ) : <Link className="command-result command-action" href={action.href || "/app"} key={action.id} onClick={() => setOpen(false)}>
                    <span><strong>{action.label}</strong><div className="row-subtitle">{action.group} / {action.description}</div></span><ArrowRight size={15} aria-hidden />
                  </Link>
                )) : <div className="empty-state compact">没有匹配动作。</div>}
              </div>

              <div className="command-section">
                <div className="command-section-title">{normalizedQuery ? "搜索结果" : "最近内容"}</div>
                {(normalizedQuery ? results : recentResults).length ? (
                  (normalizedQuery ? results : recentResults).map((item) => (
                    <Link className="command-result" href={item.href} key={`${item.type}-${item.title}`} onClick={() => setOpen(false)}>
                    <strong>{item.title}</strong>
                    <div className="row-subtitle">
                      {item.type} / {item.summary}
                    </div>
                  </Link>
                  ))
                ) : (
                  <div className="empty-state compact">没有匹配结果。可以尝试搜索“项目”“提示词”或“STM32”。</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
