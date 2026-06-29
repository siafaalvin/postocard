"use client";
import { useState, useEffect } from "react";

export function useOrientation() {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    function check() {
      setIsLandscape(window.innerWidth > window.innerHeight && window.innerWidth >= 568);
    }
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", () => setTimeout(check, 100));
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  return isLandscape;
}
