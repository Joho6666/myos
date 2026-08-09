"use client";

import { Check, ChevronDown, LogOut, Menu, Moon, Palette, Plus, Sun } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CommandPalette } from "@/components/command/command-palette";
import { logoutAction } from "@/app/login/actions";
import { DesktopFocusToggle } from "./desktop-focus-toggle";
import { navGroups } from "./nav-items";

export function Topbar({ email }: { email: string }) {
  const [dark, setDark] = useState(false);
  const [skin, setSkin] = useState("ocean");

  const skins = [
    { id: "ocean", label: "海洋蓝", description: "清晰冷静" },
    { id: "forest", label: "森林绿", description: "低干扰" },
    { id: "sunset", label: "日落橙", description: "温暖专注" },
    { id: "grape", label: "星云紫", description: "夜间创作" }
  ];

  useEffect(() => {
    const savedSkin = window.localStorage.getItem("myos-skin");
    const savedMode = window.localStorage.getItem("myos-color-mode");
    if (savedSkin) setSkin(savedSkin);
    if (savedMode === "dark") setDark(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    window.localStorage.setItem("myos-color-mode", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    document.documentElement.dataset.skin = skin;
    window.localStorage.setItem("myos-skin", skin);
  }, [skin]);

  return (
    <header className="topbar">
      <details className="mobile-menu">
        <summary aria-label="打开导航"><Menu size={18} aria-hidden /></summary>
        <nav className="mobile-menu-panel" aria-label="移动导航">
          {navGroups.map((group) => {
            const GroupIcon = group.icon;
            return <details key={group.label}>
              <summary><span><GroupIcon size={16} aria-hidden />{group.label}</span><ChevronDown size={15} aria-hidden /></summary>
              {group.items.map((item) => { const Icon = item.icon; return <Link href={item.href} key={item.href}><Icon size={16} aria-hidden />{item.label}</Link>; })}
            </details>;
          })}
        </nav>
      </details>
      <CommandPalette />
      <div className="top-actions">
        <Link className="text-button" href="/app/projects">
          <Plus size={16} aria-hidden />
          新建
        </Link>
        <details className="theme-picker">
          <summary className="icon-button" aria-label="选择主题皮肤"><Palette size={17} aria-hidden /></summary>
          <div className="theme-picker-panel">
            <div className="theme-picker-heading"><strong>界面皮肤</strong><span>保存在这台设备</span></div>
            <div className="theme-options">
              {skins.map((option) => (
                <button className={skin === option.id ? "theme-option active" : "theme-option"} type="button" key={option.id} onClick={() => setSkin(option.id)}>
                  <span className={`theme-swatch ${option.id}`} aria-hidden />
                  <span><strong>{option.label}</strong><small>{option.description}</small></span>
                  {skin === option.id ? <Check size={15} aria-hidden /> : null}
                </button>
              ))}
            </div>
          </div>
        </details>
        <DesktopFocusToggle />
        <button className="icon-button" type="button" aria-label="切换深浅色" onClick={() => setDark((current) => !current)}>
          {dark ? <Sun size={17} aria-hidden /> : <Moon size={17} aria-hidden />}
        </button>
        <form action={logoutAction}>
          <button className="text-button" type="submit" title={email}>
            <LogOut size={16} aria-hidden />
            <span className="logout-label">退出</span>
          </button>
        </form>
      </div>
    </header>
  );
}
