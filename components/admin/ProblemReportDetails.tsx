"use client";

// Resident/admin "Details" modal for a problem report. Renders every piece of
// auto-collected context and a "Copy full report" button that produces a
// self-contained markdown block — paste it into an AI agent / issue tracker to
// fix the bug without asking the reporter anything.

import { useState } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/format";
import type { ProblemReport } from "@/lib/models/types";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  resident: "Resident",
  intern: "Intern",
};

function levelTone(level: string): "default" | "warning" | "danger" {
  if (level === "error") return "danger";
  if (level === "warn") return "warning";
  return "default";
}

function buildReportText(r: ProblemReport): string {
  const ctx = r.context;
  const lines: string[] = [];
  lines.push("# Problem report");
  lines.push("");
  lines.push(`- **Report ID:** ${r._id?.toString() ?? "—"}`);
  lines.push(`- **Status:** ${r.status}`);
  lines.push(`- **Reported by:** ${r.performedByName ?? "Unknown"} (${ROLE_LABELS[r.role] || r.role})`);
  if (r.performedByLoginId) lines.push(`- **Login ID:** ${r.performedByLoginId}`);
  if (r.performedByEmail) lines.push(`- **Email:** ${r.performedByEmail}`);
  lines.push(`- **Reported at:** ${formatDateTime(r.createdAt)}`);
  if (ctx?.localTime) lines.push(`- **Reporter's local time:** ${ctx.localTime}`);
  if (ctx?.timezone) lines.push(`- **Timezone:** ${ctx.timezone}`);
  lines.push(`- **Page:** ${r.url ?? "—"}`);
  if (r.referer) lines.push(`- **Referer:** ${r.referer}`);
  lines.push(`- **Correlation ID:** ${r.correlationId ?? "—"}`);
  if (r.ip) lines.push(`- **IP:** ${r.ip}`);
  lines.push("");
  lines.push("## What happened");
  lines.push("");
  lines.push(r.description || "—");
  lines.push("");
  if (ctx) {
    lines.push("## Auto-collected diagnostics");
    lines.push("");
    lines.push(`- **Device:** ${ctx.deviceType ?? "—"} · screen ${ctx.screen ?? "—"} · viewport ${ctx.viewport ?? "—"}`);
    lines.push(`- **Browser:** ${ctx.ua ?? "—"}`);
    lines.push(`- **Platform:** ${ctx.platform ?? "—"} · language ${ctx.language ?? "—"}`);
    lines.push(`- **Offline submissions pending sync:** ${ctx.pendingOffline ?? 0}`);
    lines.push("");
  }
  if (r.ua) {
    lines.push("## Server-captured");
    lines.push("");
    lines.push(`- **User-Agent:** ${r.ua}`);
    lines.push("");
  }
  if (ctx?.recentConsole?.length) {
    lines.push(`## Recent console / JS errors (${ctx.recentConsole.length})`);
    lines.push("");
    for (const l of ctx.recentConsole) {
      lines.push(`- [${l.level}] ${l.at} — ${l.message}`);
    }
    lines.push("");
  } else {
    lines.push("## Recent console / JS errors");
    lines.push("");
    lines.push("(none captured)");
    lines.push("");
  }
  return lines.join("\n");
}

export default function ProblemReportDetails({ report }: { report: ProblemReport }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = buildReportText(report);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const ctx = report.context;

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Details
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal="true" aria-label="Problem report details">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-lg max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold">Problem report</h3>
              <Badge tone={report.status === "resolved" ? "success" : "warning"}>{report.status}</Badge>
            </div>

            <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted">Reported by</dt>
                <dd className="font-medium" dir="auto">{report.performedByName ?? "Unknown"} <span className="text-xs text-muted font-normal">({ROLE_LABELS[report.role] || report.role})</span></dd>
                {report.performedByLoginId && <dd className="text-xs text-muted break-all">{report.performedByLoginId}</dd>}
              </div>
              <div>
                <dt className="text-xs text-muted">Reported at</dt>
                <dd>{formatDateTime(report.createdAt)}</dd>
                {ctx?.localTime && <dd className="text-xs text-muted">local: {ctx.localTime}</dd>}
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted">Page</dt>
                <dd className="break-all" dir="ltr">{report.url ?? "—"}</dd>
                {report.referer && <dd className="text-xs text-muted break-all" dir="ltr">referer: {report.referer}</dd>}
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted">Correlation ID</dt>
                <dd className="font-mono text-xs break-all">{report.correlationId ?? "—"}</dd>
              </div>
              {ctx && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted">Device</dt>
                  <dd>
                    {ctx.deviceType ?? "—"} · screen {ctx.screen ?? "—"} · viewport {ctx.viewport ?? "—"}
                    <span className="block text-xs text-muted">
                      {ctx.ua ?? "—"}
                    </span>
                    <span className="block text-xs text-muted">
                      {ctx.platform ? `${ctx.platform} · ` : ""}{ctx.language ? `${ctx.language} · ` : ""}timezone {ctx.timezone ?? "—"} · pending offline syncs {ctx.pendingOffline ?? 0}
                    </span>
                  </dd>
                </div>
              )}
              {report.ip && (
                <div>
                  <dt className="text-xs text-muted">IP</dt>
                  <dd className="font-mono text-xs">{report.ip}</dd>
                </div>
              )}
            </dl>

            <div className="mt-4">
              <dt className="text-xs text-muted">Description</dt>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink/90" dir="auto">{report.description}</p>
            </div>

            <div className="mt-4">
              <dt className="text-xs text-muted">Recent console / JS logs ({ctx?.recentConsole?.length ?? 0})</dt>
              <div className="mt-1 flex max-h-48 flex-col gap-1 overflow-y-auto rounded-lg border border-border bg-bg/60 p-2">
                {(ctx?.recentConsole ?? []).length === 0 ? (
                  <p className="text-xs text-muted">(none captured)</p>
                ) : (
                  ctx!.recentConsole!.map((l, i) => (
                    <div key={i} className="text-xs">
                      <Badge tone={levelTone(l.level)} className="mr-1.5">{l.level}</Badge>
                      <span className="text-muted">{l.at}</span>
                      <span className="ml-1 block text-ink/80 break-words font-mono" dir="ltr">{l.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={copy}>{copied ? "Copied!" : "Copy full report"}</Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
            </div>
            {!copied && (
              <p className="mt-2 text-xs text-muted">
                &quot;Copy full report&quot; builds a ready-to-paste diagnostic block (reporter, page, timezone, browser, correlation id, JS errors) for the developer.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
