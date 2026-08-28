"use client";

import { createContext, useContext } from "react";
import type { CreationOpenOptions } from "./types";

type CreationCenterApi = { openCreation: (options?: CreationOpenOptions) => void; closeCreation: () => void; };
export const CreationCenterContext = createContext<CreationCenterApi | null>(null);
export function useCreationCenter() {
  const value = useContext(CreationCenterContext);
  if (!value) throw new Error("创建中心只能在 MyOS 应用布局中使用。");
  return value;
}
