"use client";

import { Check, ChevronDown, LogOut, Menu, Moon, Palette, Plus, Sun, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CommandPalette } from "@/components/command/command-palette";
import { logoutAction } from "@/app/login/actions";
import { DesktopFocusToggle } from "./desktop-focus-toggle";
import { navGroups } from "./nav-items";
import { normalizeSkinId, themeSkins } from "@/lib/theme/skins";
import { useCreationCenter } from "@/features/creation/creation-context";

export function Topbar({ email }: { email: string }) {
  const { openCreation } = useCreationCenter();
  const [dark, setDark] = useState(false);
  const [skin, setSkin] = useState("ocean");
  const [menuOpen, setMenuOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedSkin = window.localStorage.getItem("myos-skin");
    const savedMode = window.localStorage.getItem("myos-color-mode");
    setSkin(normalizeSkinId(savedSkin));
    if (savedMode === "dark") setDark(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    window.localStorage.setItem("myos-color-mode", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const nextSkin = normalizeSkinId(skin);
    document.documentElement.dataset.skin = nextSkin;
    window.localStorage.setItem("myos-skin", nextSkin);
  }, [skin]);

  useEffect(() => {
    if (!themeOpen) return;
    function closeOnPointerDown(event: PointerEvent) {
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest(".theme-picker")) setThemeOpen(false);
    }
    function closeOnKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setThemeOpen(false);
    }
    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnKeyDown);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnKeyDown);
    };
  }, [themeOpen]);

  return (
    <header className="topbar">
      <div className="mobile-menu" ref={menuRef}>
        <button
          className="icon-button"
          type="button"
          aria-label={menuOpen ? "关闭导航" : "打开导航"}
          onClick={() => setMenuOpen((current) => !current)}
        >
          {menuOpen ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
        </button>
        {menuOpen ? (
          <nav className="mobile-menu-panel" aria-label="移动导航">
            {navGroups.map((group) => {
              const GroupIcon = group.icon;
              return (
                <details key={group.label} open>
                  <summary>
                    <span>
                      <GroupIcon size={16} aria-hidden />
                      {group.label}
                    </span>
                    <ChevronDown size={15} aria-hidden />
                  </summary>
                  <div>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          href={item.href}
                          key={item.href}
                          onClick={() => setMenuOpen(false)}
                        >
                          <Icon size={16} aria-hidden />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </nav>
        ) : null}
      </div>

      <CommandPalette />

      <div className="top-actions">
        <button className="text-button" type="button" onClick={(event) => openCreation({ trigger: event.currentTarget })}>
          <Plus size={16} aria-hidden />
          新建
        </button>

        <div className="theme-picker" style={{ position: "relative" }}>
          <button
            className="icon-button"
            type="button"
            aria-label="选择主题皮肤"
            onClick={() => setThemeOpen((current) => !current)}
          >
            <Palette size={17} aria-hidden />
          </button>
          {themeOpen ? (
            <div className="theme-picker-panel">
              <div className="theme-picker-heading">
                <strong>界面皮肤</strong>
                <span>保存在这台设备</span>
              </div>
              <div className="theme-options">
                {themeSkins.map((option) => (
                  <button
                    className={skin === option.id ? "theme-option active" : "theme-option"}
                    type="button"
                    key={option.id}
                    onClick={() => {
                      setSkin(option.id);
                      setThemeOpen(false);
                    }}
                  >
                    <span className="theme-swatch" style={{ background: `linear-gradient(135deg, ${option.colors[1]}, ${option.colors[2]})` }} aria-hidden />
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                    {skin === option.id ? <Check size={15} aria-hidden /> : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <DesktopFocusToggle />
        <button
          className="icon-button"
          type="button"
          aria-label="切换深浅色"
          onClick={() => setDark((current) => !current)}
        >
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

