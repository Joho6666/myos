"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function BackendStatusBanner() {
  const [checking, setChecking] = useState(true);
  const [available, setAvailable] = useState(true);

  const checkBackend = useCallback(async () => {
    setChecking(true);
    try {
      const response = await fetch("/api/myos/data?health=1", { cache: "no-store", credentials: "include" });
      setAvailable(response.ok);
    } catch {
      setAvailable(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void checkBackend();
  }, [checkBackend]);

  if (checking || available) return null;

  return (
    <div className="backend-status-banner" role="alert">
      <AlertTriangle size={18} aria-hidden />
      <span>
        MyOS 数据服务暂不可用。页面当前显示的是临时示例数据，新增、修改和删除不会保存；请启动 Supabase 或检查连接配置。
      </span>
      <button className="text-button" type="button" onClick={() => void checkBackend()}>
        <RefreshCw size={15} aria-hidden />重新检查
      </button>
    </div>
  );
}

