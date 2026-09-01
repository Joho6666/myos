import { Cloud, WifiOff } from "lucide-react";
import { getStorageStatus } from "./storage";
import type { LocalState } from "./data";

export function SyncStatus({ state, online, message }: { state: LocalState; online: boolean; message: string }) {
  const storage = getStorageStatus();
  return (
    <p className="status">
      {online ? <Cloud size={14} /> : <WifiOff size={14} />}
      {online ? "在线" : "离线"}
      {state.queue.length ? ` · 队列 ${state.queue.length}` : ""}
      {state.lastSyncAt ? ` · 上次同步 ${state.lastSyncAt.slice(11, 16) || state.lastSyncAt.slice(0, 10)}` : " · 尚未同步"}
      {` · ${storage.backend === "sqlite" ? "加密库" : "本地偏好"}`}
      {message ? ` · ${message}` : ""}
    </p>
  );
}
