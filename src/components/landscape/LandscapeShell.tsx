"use client";
import { useOrientation } from "./useOrientation";

export function LandscapeShell({ children }: { children: React.ReactNode }) {
  const isLandscape = useOrientation();

  return (
    <>
      <style>{isLandscape ? `
        [data-navbar], [data-bottomnav], [data-fab], [data-feedtabs] {
          display: none !important;
        }
        main {
          padding: 0 !important;
          max-width: 100% !important;
          margin: 0 !important;
          height: 100dvh !important;
          overflow: hidden !important;
        }
        .min-h-screen {
          min-height: 100dvh !important;
          height: 100dvh !important;
          overflow: hidden !important;
          padding: 0 !important;
        }
        /* Kill all scroll on landscape */
        html, body {
          overflow: hidden !important;
          height: 100dvh !important;
        }
      ` : ''}</style>
      {children}
    </>
  );
}
