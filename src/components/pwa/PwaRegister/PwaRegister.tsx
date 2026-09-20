// src/components/pwa/PwaRegister/PwaRegister.tsx

"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    function registerServiceWorker() {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Erro ao registrar o PWA:", error);
      });
    }

    window.addEventListener("load", registerServiceWorker);

    return () => {
      window.removeEventListener("load", registerServiceWorker);
    };
  }, []);

  return null;
}