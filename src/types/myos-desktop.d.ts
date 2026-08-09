export {};

declare global {
  interface Window {
    myosDesktop?: {
      isDesktop: boolean;
      getVersion: () => Promise<string>;
      openDataDir: () => Promise<string>;
      showMainWindow: () => Promise<{ shown: boolean }>;
      restartServices: () => Promise<{ ready: boolean; port?: number }>;
      toggleFocusWindow: () => Promise<{ visible: boolean }>;
      getFocusWindowStatus: () => Promise<{ available: boolean; visible: boolean }>;
    };
  }
}
