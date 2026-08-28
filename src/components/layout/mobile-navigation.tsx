"use client";

import Link from "next/link";
import {
  CalendarCheck,
  Bot,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Inbox,
  LayoutGrid,
  Plus,
  X
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { moreNavSections } from "./nav-items";
import { useCreationCenter } from "@/features/creation/creation-context";

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/app" && pathname.startsWith(href));
}

export function MobileNavigation() {
  const { openCreation } = useCreationCenter();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const moreIsActive = moreNavSections.some((section) =>
    section.items.some((item) => isActive(pathname, item.href))
  );

  return (
    <nav className="mobile-dock" aria-label="移动端主导航">
      {/* 1. 今天 */}
      <Link
        className={isActive(pathname, "/app") ? "mobile-dock-link active" : "mobile-dock-link"}
        href="/app"
        onClick={() => setMoreOpen(false)}
      >
        <CalendarCheck size={19} aria-hidden />
        <span>今天</span>
      </Link>

      {/* 2. 任务 */}
      <Link
        className={isActive(pathname, "/app/tasks") ? "mobile-dock-link active" : "mobile-dock-link"}
        href="/app/tasks"
        onClick={() => setMoreOpen(false)}
      >
        <CheckSquare size={19} aria-hidden />
        <span>任务</span>
      </Link>

      {/* 3. 悬浮居中 Plus 按钮 */}
      <button
        className="mobile-floating-plus-btn"
        type="button"
        aria-label="打开创建中心"
        title="新建"
        onClick={(event) => { setMoreOpen(false); openCreation({ trigger: event.currentTarget }); }}
      >
        <Plus size={24} strokeWidth={2.6} />
      </button>

      {/* 4. 收件箱 */}
      <Link
        className={isActive(pathname, "/app/inbox") ? "mobile-dock-link active" : "mobile-dock-link"}
        href="/app/inbox"
        onClick={() => setMoreOpen(false)}
      >
        <Inbox size={19} aria-hidden />
        <span>收件箱</span>
      </Link>

      {/* 5. AI */}
      <Link
        className={isActive(pathname, "/app/ai") ? "mobile-dock-link active" : "mobile-dock-link"}
        href="/app/ai"
        onClick={() => setMoreOpen(false)}
      >
        <Bot size={19} aria-hidden />
        <span>AI</span>
      </Link>

      {/* 6. 更多入口抽屉 */}
      <div className="mobile-dock-more" style={{ position: "relative" }}>
        <button
          className={moreIsActive || moreOpen ? "mobile-dock-link active" : "mobile-dock-link"}
          type="button"
          onClick={() => setMoreOpen((prev) => !prev)}
          style={{ background: "transparent", border: 0, width: "100%", cursor: "pointer" }}
        >
          <LayoutGrid size={19} aria-hidden />
          <span>更多</span>
          {moreOpen ? <ChevronDown size={11} aria-hidden /> : <ChevronUp size={11} aria-hidden />}
        </button>

        {moreOpen ? (
          <div className="mobile-dock-sheet">
            <div className="mobile-dock-sheet-handle" onClick={() => setMoreOpen(false)} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>全部功能模块</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                style={{ background: "transparent", border: 0, padding: 4, cursor: "pointer", color: "inherit" }}
              >
                <X size={16} />
              </button>
            </div>
            {moreNavSections.map((section) => (
              <div className="mobile-nav-group" key={section.label}>
                <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, padding: "4px 0" }}>
                  {section.label}
                </div>
                <div>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        className={isActive(pathname, item.href) ? "active" : ""}
                        href={item.href}
                        key={item.href}
                        onClick={() => setMoreOpen(false)}
                      >
                        <Icon size={16} aria-hidden />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </nav>
  );
}

