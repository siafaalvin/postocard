import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: { default: "Postocard", template: "%s | Postocard" },
  description: "Chronological social feed — no algorithm, no noise.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Postocard" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem("postocard-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme:dark)").matches))document.documentElement.classList.add("dark")})()` }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
