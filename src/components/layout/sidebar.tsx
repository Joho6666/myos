"use client";

import Link from "next/link";
import { ChevronDown, Command, LayoutGrid, Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { moreNavSections, primaryNavItems } from "./nav-items";
import { useCreationCenter } from "@/features/creation/creation-context";

export function Sidebar() {
  const { openCreation } = useCreationCenter();
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || (href !== "/app" && pathname.startsWith(href));

  return <aside className="sidebar" aria-label="主导航">
    <Link className="sidebar-brand" href="/app"><span><Command size={18} aria-hidden /></span><div><strong>MyOS</strong><small>PERSONAL AI OS</small></div></Link>
    <p className="sidebar-label">工作台</p>
    <nav className="sidebar-primary">
      {primaryNavItems.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className={isActive(item.href) ? "sidebar-link active" : "sidebar-link"}><Icon size={18} aria-hidden /><span>{item.label}</span></Link>; })}
    </nav>
    <button className="sidebar-create" type="button" onClick={(event) => openCreation({ trigger: event.currentTarget })}><Plus size={16} aria-hidden />新建</button>
    <details className="sidebar-more" open={moreNavSections.some((section) => section.items.some((item) => isActive(item.href)))}>
      <summary><LayoutGrid size={16} aria-hidden /><span>更多功能</span><ChevronDown size={15} aria-hidden /></summary>
      {moreNavSections.map((section) => (
        <div className="sidebar-more-section" key={section.label}>
          <span>{section.label}</span>
          {section.items.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className={isActive(item.href) ? "sidebar-link active" : "sidebar-link"}><Icon size={16} aria-hidden /><span>{item.label}</span></Link>; })}
        </div>
      ))}
    </details>
    <div className="sidebar-footer"><span className="sidebar-avatar">J</span><div><strong>JOHO</strong><small>私人工作空间</small></div></div>
  </aside>;
}
