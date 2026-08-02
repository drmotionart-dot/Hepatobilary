// Automatic diagnostic capture for "report a problem" — zero user effort.
// Once installed (app boot), every console.error/warn/log line and every
// unhandled JS error/rejection is kept in a rolling buffer. When a staff member
// files a report, snapshotDiagnostics() packages that buffer together with the
// browser/device/timezone state so a developer can fix the issue from the
// report alone — no follow-up questions for non-technical staff.

import { getPendingCount } from "@/lib/offline-queue";

export type DiagLevel = "log" | "warn" | "error";

export interface DiagConsoleLine {
  level: DiagLevel;
  message: string;
  at: string;
}

const MAX_LINES = 40;
let buffer: DiagConsoleLine[] = [];
let installed = false;

function push(level: DiagLevel, message: string): void {
  buffer = [...buffer.slice(-(MAX_LINES - 1)), { level, message, at: new Date().toLocaleString("en-GB", { hour12: true }) }];
}

// Idempotent: safe to call from multiple mount points. Only the first call
// wraps the console; later calls no-op.
export function installDiagnostics(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const origError = console.error;
  const origWarn = console.warn;
  const origLog = console.log;

  console.error = (...args: unknown[]) => {
    push("error", args.map(String).join(" "));
    origError(...args);
  };
  console.warn = (...args: unknown[]) => {
    push("warn", args.map(String).join(" "));
    origWarn(...args);
  };
  console.log = (...args: unknown[]) => {
    push("log", args.map(String).join(" "));
    origLog(...args);
  };

  window.addEventListener("error", (e) => {
    const loc = e.filename && e.lineno ? ` @ ${e.filename}:${e.lineno}` : "";
    push("error", `window.onerror: ${e.message}${loc}`);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason instanceof Error ? `${e.reason.name}: ${e.reason.message}` : String(e.reason);
    push("error", `unhandledrejection: ${reason}`);
  });
}

export function getRecentConsole(): DiagConsoleLine[] {
  return [...buffer];
}

export function getDeviceType(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  const mobile = (navigator as unknown as { userAgentData?: { mobile?: boolean } }).userAgentData?.mobile;
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone|iPod/i.test(ua) || mobile) return "mobile";
  return "desktop";
}

export interface DiagnosticsSnapshot {
  ua: string;
  language: string;
  platform: string;
  timezone: string;
  screen: string;
  viewport: string;
  deviceType: string;
  localTime: string;
  pendingOffline: number;
  recentConsole: DiagConsoleLine[];
}

// The full auto-collected snapshot attached to a problem report. Everything the
// developer needs: where the user was, on what device/browser/timezone, what
// the JS runtime logged, and how many offline submissions were queued.
export function snapshotDiagnostics(): DiagnosticsSnapshot {
  if (typeof window === "undefined") {
    return {
      ua: "",
      language: "",
      platform: "",
      timezone: "",
      screen: "",
      viewport: "",
      deviceType: "unknown",
      localTime: "",
      pendingOffline: 0,
      recentConsole: [],
    };
  }
  let tz = "";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    tz = "";
  }
  return {
    ua: navigator.userAgent || "",
    language: navigator.language || "",
    platform: (navigator as unknown as { platform?: string }).platform || "",
    timezone: tz,
    screen: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    deviceType: getDeviceType(),
    localTime: new Date().toLocaleString("en-GB", { hour12: true }),
    pendingOffline: getPendingCount(),
    recentConsole: getRecentConsole(),
  };
}
