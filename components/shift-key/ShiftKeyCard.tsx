"use client";

// Dashboard shift-key card (spec 11.6/11.7): shows the current ward key, when
// it was generated, and (for holders of the generate-shift-key capability) a
// "Generate new key" button. A "Copy" button lets the duty team share it.

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { getRole } from "@/lib/shift-key-client";
import { useShiftKey } from "@/components/shift-key/ShiftKeyProvider";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type CurrentKey = { key: string; generatedAt?: string; generatedBy?: { fullName?: string } | null };

export default function ShiftKeyCard({ role: roleProp }: { role?: string }) {
  // roleProp comes from the server component so SSR and hydration agree; the
  // getRole() fallback keeps it working if the prop is ever omitted.
  const clientRole = getRole();
  const role = roleProp ?? clientRole;
  const { cachedKey, saveKey, requestKey } = useShiftKey();
  const [current, setCurrent] = useState<CurrentKey | null>(null);
  const [internCanGenerate, setInternCanGenerate] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(() => {
    apiFetch("/api/shift-key/current")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (d?.key) setCurrent(d);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    // Interns see the generate button only when they actually hold the
    // capability (spec 11.7) — read fresh so a grant shows up without re-login.
    if (role === "intern") {
      apiFetch("/api/auth/me")
        .then((res) => (res.ok ? res.json() : null))
        .then((d) => setInternCanGenerate(Array.isArray(d?.user?.grantedCapabilities) && d.user.grantedCapabilities.includes("generate-shift-key")))
        .catch(() => {});
    }
  }, [refresh, role]);

  async function generate() {
    setError("");
    setGenerating(true);
    try {
      const res = await apiFetch("/api/shift-key/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Could not generate a new key");
        return;
      }
      const d = await res.json();
      // Everyone with this capability also uses the key themselves.
      if (role === "intern") await saveKey(d.key, d.generatedAt);
      refresh();
    } finally {
      setGenerating(false);
    }
  }

  async function copy() {
    if (!current?.key) return;
    try {
      await navigator.clipboard.writeText(current.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Could not copy — copy the code manually.");
    }
  }

  const canGenerate = role === "admin" || role === "resident" || (role === "intern" && internCanGenerate);

  return (
    <Card title="Ward shift key" id="shift-key-card" className="flex flex-col gap-3">
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 font-mono text-2xl font-semibold tracking-[0.2em] text-primary">
            {current?.key ?? "——"}
          </span>
          {current?.generatedAt && (
            <div className="text-xs text-muted">
              <p>Active key</p>
              <p>{new Date(current.generatedAt).toLocaleString("en-GB")}</p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={copy} disabled={!current?.key}>
            {copied ? "Copied" : "Copy"}
          </Button>
          {canGenerate && (
            <Button size="sm" onClick={generate} loading={generating} disabled={generating}>
              {generating ? "Generating…" : "Generate new key"}
            </Button>
          )}
        </div>
      </div>

      {role === "intern" && (
        <p className="text-xs text-muted">
          {cachedKey ? (
            <>Your saved key is <span className="font-mono text-primary">{cachedKey}</span> — it&apos;s attached to your patient-data actions automatically.</>
          ) : (
            <>
              You haven&apos;t entered today&apos;s key yet.{" "}
              <button type="button" className="text-primary font-medium underline underline-offset-2" onClick={() => requestKey()}>
                Enter it now
              </button>
            </>
          )}
        </p>
      )}
      <p className="text-[11px] text-muted">
        Interns must hold the current key to write notes, labs, treatments, imaging or referrals. Generating a new key retires the previous one.
      </p>
    </Card>
  );
}
