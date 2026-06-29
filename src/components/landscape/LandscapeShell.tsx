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
        }
        .min-h-screen {
          padding: 0 !important;
        }
      ` : ''}</style>
      {children}
    </>
  );
}
