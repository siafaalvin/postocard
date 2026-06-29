"use client";
import { useState, useEffect } from "react";

export function useOrientation() {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    function check() {
      // Only activate on touch devices (mobile/tablet), not desktop browsers
      const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isLandscapeOrientation = window.innerWidth > window.innerHeight;
      // Also check screen width isn't too large (desktop monitors are landscape but shouldn't trigger)
      const isMobileSize = window.innerWidth < 1200;
      setIsLandscape(isTouchDevice && isLandscapeOrientation && isMobileSize);
    }
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", () => setTimeout(check, 150));
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  return isLandscape;
}
