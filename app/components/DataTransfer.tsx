"use client";

import { ChangeEvent, useRef, useState } from "react";
import { importTrackerData, isTrackerState } from "../lib/trackerData";
import { EXAM_CONFIG_KEY, normalizeExamConfig, storageKeyForConfig } from "../lib/examConfig";

const download = (payload: unknown) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href = url; link.download = `cfa-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click();
  URL.revokeObjectURL(url);
};

export default function DataTransfer() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState(""); const [error, setError] = useState(false); const [busy, setBusy] = useState(false);
  const notify = (text: string, failed = false) => { setMessage(text); setError(failed); window.setTimeout(() => setMessage(""), 4000); };

  const exportData = () => {
    try {
      const config = normalizeExamConfig(JSON.parse(window.localStorage.getItem(EXAM_CONFIG_KEY) || "{}"));
      const state = JSON.parse(window.localStorage.getItem(storageKeyForConfig(config)) || "{}");
      download({ app: "cfa-study-tracker", schemaVersion: 3, exportedAt: new Date().toISOString(), examConfig: config, state });
      notify("Backup exported with your active exam configuration.");
    } catch { notify("Could not export this browser’s tracker data.", true); }
  };

  const importData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return; setBusy(true);
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed?.examConfig && parsed?.state && typeof parsed.state === "object") {
        const config = normalizeExamConfig(parsed.examConfig);
        window.localStorage.setItem(EXAM_CONFIG_KEY, JSON.stringify({ ...config, onboardingComplete: true }));
        window.localStorage.setItem(storageKeyForConfig(config), JSON.stringify(parsed.state));
        notify("Backup restored. Reloading your configured tracker…");
      } else {
        const legacy = await importTrackerData(file);
        if (!isTrackerState(legacy)) throw new Error("Invalid backup");
        const config = normalizeExamConfig({ level: "l1", onboardingComplete: true });
        window.localStorage.setItem(EXAM_CONFIG_KEY, JSON.stringify(config));
        window.localStorage.setItem(storageKeyForConfig(config), JSON.stringify(legacy));
        notify("Legacy Level I backup restored. Reloading…");
      }
      window.setTimeout(() => window.location.reload(), 650);
    } catch { notify("The selected backup is invalid or unreadable.", true); }
    finally { setBusy(false); event.target.value = ""; }
  };

  return <section className="dataTransfer" aria-label="Data backup and restore"><button type="button" className="ghost" onClick={exportData}>Export backup</button><button type="button" className="ghost" disabled={busy} onClick={() => inputRef.current?.click()}>{busy ? "Importing…" : "Import backup"}</button><input ref={inputRef} type="file" accept="application/json,.json" hidden onChange={importData} />{message && <span className={error ? "dataTransferError" : "dataTransferMessage"} role="status">{message}</span>}</section>;
}
