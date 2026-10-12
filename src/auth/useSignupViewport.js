import { useEffect } from "react";

// Mobile keyboards resize the visual viewport, not always 100vh/100dvh.
// Both portaled dialogs use these values to stay above the keyboard.
export function useSignupViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    const update = () => {
      root.style.setProperty("--signup-viewport-height", `${viewport.height}px`);
      root.style.setProperty("--signup-viewport-top", `${viewport.offsetTop}px`);
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      root.style.removeProperty("--signup-viewport-height");
      root.style.removeProperty("--signup-viewport-top");
    };
  }, []);
}
