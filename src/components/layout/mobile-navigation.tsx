"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp, LayoutGrid } from "lucide-react";
import { usePathname } from "next/navigation";
import { moreNavSections, primaryNavItems } from "./nav-items";

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/app" && pathname.startsWith(href));
}

export function MobileNavigation() {
  const pathname = usePathname();
  const moreIsActive = moreNavSections.some((section) => section.items.some((item) => isActive(pathname, item.href)));

  return (
    <nav className="mobile-dock" aria-label="移动端主导航">
      {primaryNavItems.map((item) => {
        const Icon = item.icon;
        return <Link className={isActive(pathname, item.href) ? "mobile-dock-link active" : "mobile-dock-link"} href={item.href} key={item.href}><Icon size={18} aria-hidden /><span>{item.label}</span></Link>;
      })}
      <details className="mobile-dock-more">
        <summary className={moreIsActive ? "mobile-dock-link active" : "mobile-dock-link"}><LayoutGrid size={18} aria-hidden /><span>更多</span><ChevronUp size={12} aria-hidden /></summary>
        <div className="mobile-dock-sheet">
          <div className="mobile-dock-sheet-handle" />
          {moreNavSections.map((section) => (
            <details className="mobile-nav-group" key={section.label} open={section.items.some((item) => isActive(pathname, item.href))}>
              <summary><span>{section.label}</span><ChevronDown size={15} aria-hidden /></summary>
              <div>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return <Link className={isActive(pathname, item.href) ? "active" : ""} href={item.href} key={item.href}><Icon size={16} aria-hidden />{item.label}</Link>;
                })}
              </div>
            </details>
          ))}
        </div>
      </details>
    </nav>
  );
}
