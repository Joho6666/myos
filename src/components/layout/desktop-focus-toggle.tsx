"use client";

import { MonitorUp } from "lucide-react";
import { useEffect, useState } from "react";

export function DesktopFocusToggle() {
  const [desktop, setDesktop] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!window.myosDesktop?.isDesktop) return;
    setDesktop(true);
    void window.myosDesktop.getFocusWindowStatus().then((status) => setVisible(status.visible)).catch(() => undefined);
  }, []);

  if (!desktop) return null;

  async function toggleFocus() {
    const result = await window.myosDesktop?.toggleFocusWindow();
    if (result) setVisible(result.visible);
  }

  return <button className={visible ? "icon-button active" : "icon-button"} type="button" onClick={() => void toggleFocus()} title="显示或隐藏桌面专注浮窗" aria-label="显示或隐藏桌面专注浮窗"><MonitorUp size={17} aria-hidden /></button>;
}
