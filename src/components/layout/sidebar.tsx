"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { navGroups } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || (href !== "/app" && pathname.startsWith(href));

  return (
    <aside className="sidebar" aria-label="主导航">
      <div className="brand">
        <strong>MyOS</strong>
        <span>个人数字操作系统</span>
      </div>
      <nav>
        <div className="nav-directory">
          {navGroups.map((group) => {
            const groupActive = group.items.some((item) => isActive(item.href));
            const GroupIcon = group.icon;
            return <details className="nav-group" key={group.label} open={groupActive}>
              <summary className={groupActive ? "nav-group-summary active" : "nav-group-summary"}>
                <GroupIcon size={16} aria-hidden />
                <span><strong>{group.label}</strong><small>{group.description}</small></span>
                <ChevronDown className="nav-more-chevron" size={15} aria-hidden />
              </summary>
              <ul className="nav-list nav-sublist">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return <li key={item.href}><Link className={isActive(item.href) ? "nav-link active" : "nav-link"} href={item.href}><Icon size={16} aria-hidden /><span>{item.label}</span></Link></li>;
                })}
              </ul>
            </details>;
          })}
        </div>
      </nav>
      <div className="sidebar-footer">
        <div className="status-tile">
          <strong>数据服务</strong>
          连接健康状态由连接看板实时检查，异常时会在页面顶部提示。
          <ChevronRight size={14} aria-hidden />
        </div>
      </div>
    </aside>
  );
}
