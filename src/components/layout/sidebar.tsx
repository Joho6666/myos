"use client";

import Link from "next/link";
import { ChevronDown, Command, LayoutGrid, Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { moreNavSections, primaryNavItems } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || (href !== "/app" && pathname.startsWith(href));
  const extraItems = moreNavSections.flatMap((section) => section.items).filter((item) => !primaryNavItems.some((primary) => primary.href === item.href));

  return <aside className="sidebar" aria-label="主导航">
    <Link className="sidebar-brand" href="/app"><span><Command size={18} aria-hidden /></span><div><strong>MyOS</strong><small>PERSONAL AI OS</small></div></Link>
    <p className="sidebar-label">工作台</p>
    <nav className="sidebar-primary">
      {primaryNavItems.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className={isActive(item.href) ? "sidebar-link active" : "sidebar-link"}><Icon size={18} aria-hidden /><span>{item.label}</span></Link>; })}
    </nav>
    <Link className="sidebar-create" href="/app/inbox"><Plus size={16} aria-hidden />快速记录</Link>
    <details className="sidebar-more" open={moreNavSections.some((section) => section.items.some((item) => isActive(item.href)))}>
      <summary><LayoutGrid size={16} aria-hidden /><span>更多功能</span><ChevronDown size={15} aria-hidden /></summary>
      {extraItems.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className={isActive(item.href) ? "sidebar-link active" : "sidebar-link"}><Icon size={16} aria-hidden /><span>{item.label}</span></Link>; })}
    </details>
    <div className="sidebar-footer"><span className="sidebar-avatar">J</span><div><strong>JOHO</strong><small>私人工作空间</small></div></div>
  </aside>;
}
