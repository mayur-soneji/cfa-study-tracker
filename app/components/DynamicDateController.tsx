"use client";

import { useEffect, useState } from "react";
import { getDaysRemaining } from "../lib/dateUtils";
import { EXAM_CONFIG_KEY, formatExamWindow, normalizeExamConfig } from "../lib/examConfig";

export default function DynamicDateController() {
  const [config, setConfig] = useState(normalizeExamConfig());

  useEffect(() => {
    const read = () => {
      try { setConfig(normalizeExamConfig(JSON.parse(window.localStorage.getItem(EXAM_CONFIG_KEY) || "{}"))); } catch { setConfig(normalizeExamConfig()); }
    };
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);

  useEffect(() => {
    const patch = () => {
      const eyebrow = document.querySelector<HTMLElement>(".eyebrow");
      if (eyebrow && eyebrow.textContent !== formatExamWindow(config)) eyebrow.textContent = formatExamWindow(config);
      const count = document.querySelector<HTMLElement>(".count");
      const value = count?.querySelector<HTMLElement>("strong");
      const label = count?.querySelector<HTMLElement>("span");
      const remaining = Math.max(0, getDaysRemaining(config.examDate));
      if (value && value.textContent !== String(remaining)) value.textContent = String(remaining);
      const nextLabel = `${remaining === 1 ? "day" : "days"} to exam`;
      if (label && label.textContent !== nextLabel) label.textContent = nextLabel;
    };
    patch();
    const observer = new MutationObserver(patch);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [config]);

  return null;
}
