"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function InstallPrompt() {
  const [showModal, setShowModal] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const deferredPrompt = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    setIsIos(/iPhone|iPad/.test(navigator.userAgent) && !(window as any).MSStream);

    window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredPrompt.current = e; });
    window.matchMedia("(display-mode: standalone)").addEventListener("change", (e) => {
      if (e.matches) { setShowModal(false); setShowBanner(false); }
    });

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const seen = localStorage.getItem("pwa-install-seen");
    if (!seen) setShowModal(true);
    else {
      const dismissed = localStorage.getItem("pwa-install-banner-dismissed");
      if (!dismissed || Date.now() - parseInt(dismissed) > 7 * 86400000) setShowBanner(true);
    }
  }, []);

  const dismissModal = useCallback(() => {
    setShowModal(false);
    localStorage.setItem("pwa-install-seen", "1");
    const d = localStorage.getItem("pwa-install-banner-dismissed");
    if (!d || Date.now() - parseInt(d) > 7 * 86400000) setShowBanner(true);
  }, []);

  const dismissBanner = useCallback(() => {
    setShowBanner(false);
    localStorage.setItem("pwa-install-banner-dismissed", String(Date.now()));
  }, []);

  const installApp = useCallback(async () => {
    if (deferredPrompt.current) {
      deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      if (outcome === "accepted") { setShowModal(false); setShowBanner(false); }
      deferredPrompt.current = null;
    }
  }, []);

  if (!showModal && !showBanner) return null;

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Install Postocard</h2>
              <button onClick={dismissModal} className="text-neutral-400 hover:text-neutral-700" aria-label="Close">✕</button>
            </div>
            {isIos ? (
              <div className="space-y-4">
                <Step n={1} title="Tap the Share button" desc="The square with arrow at the bottom of Safari." />
                <Step n={2} title='Tap "Add to Home Screen"' desc="Scroll down in the share menu." />
                <Step n={3} title='Tap "Add"' desc="Postocard appears on your home screen like a native app." />
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-neutral-600 dark:text-neutral-300">Add Postocard to your home screen for the full experience.</p>
                {deferredPrompt.current ? (
                  <button onClick={installApp} className="w-full py-2.5 rounded-lg text-white font-medium text-sm bg-[#C84B31]">Install Postocard</button>
                ) : (
                  <p className="text-xs text-neutral-500">Tap browser menu → &quot;Add to Home Screen&quot;</p>
                )}
              </div>
            )}
            <button onClick={dismissModal} className="w-full py-2 text-xs text-neutral-500">Not now</button>
          </div>
        </div>
      )}

      {showBanner && !showModal && (
        <div className="fixed top-[60px] inset-x-0 z-[100]">
          <div className="mx-2 mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg">
            <img src="/icons/icon-192.png" alt="Postocard" className="w-6 h-6 rounded-md" />
            <p className="flex-1 text-[11px] font-medium">Install Postocard</p>
            {deferredPrompt.current ? (
              <button onClick={installApp} className="text-[11px] font-semibold text-[#C84B31]">Install</button>
            ) : isIos ? (
              <button onClick={() => { setShowBanner(false); setShowModal(true); }} className="text-[11px] font-semibold text-[#C84B31]">How?</button>
            ) : null}
            <button onClick={dismissBanner} className="text-neutral-400" aria-label="Dismiss">✕</button>
          </div>
        </div>
      )}
    </>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="shrink-0 w-7 h-7 rounded-full bg-[#C84B31]/20 text-[#C84B31] flex items-center justify-center text-xs font-bold">{n}</span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-neutral-500 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
