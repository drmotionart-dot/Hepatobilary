"use client";

// Granular capability grants (spec 11.7/11.8). Toggle checkboxes are set-semantics:
// the whole list is PUT on every change, so toggling reflects immediately. The
// backend re-reads the user fresh, so a grant takes effect for the intern on
// their next gated action — no re-login required.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { apiFetch } from "@/lib/client-api";
import type { Capability } from "@/lib/models/types";

const OPTIONS: { value: Capability; label: string; hint: string }[] = [
  { value: "generate-shift-key", label: "Generate shift key", hint: "May generate a new ward shift key (retires the previous one)" },
];

export default function CapabilityManager({ userId, granted = [] }: { userId: string; granted?: Capability[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Capability[]>(granted);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function save(next: Capability[]) {
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/capabilities`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capabilities: next }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Could not update capabilities");
        setSaving(false);
        return;
      }
      setMessage("Saved — takes effect immediately.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function toggle(cap: Capability) {
    const next = draft.includes(cap) ? draft.filter((c) => c !== cap) : [...draft, cap];
    setDraft(next);
    void save(next);
  }

  return (
    <div>
      <div className="flex flex-col gap-2">
        {OPTIONS.map((c) => {
          const on = draft.includes(c.value);
          return (
            <label key={c.value} className={`flex items-start gap-2 rounded-lg border p-2.5 text-sm transition-colors ${on ? "border-primary/40 bg-primary/5" : "border-border"}`}>
              <input
                type="checkbox"
                checked={on}
                disabled={saving}
                onChange={() => toggle(c.value)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">{c.label}</span>
                <span className="block text-xs text-muted">{c.hint}</span>
              </span>
            </label>
          );
        })}
      </div>
      {saving && <p className="mt-2 text-xs text-muted">Saving…</p>}
      {message && <p className="mt-2 text-xs text-success">{message}</p>}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      {OPTIONS.length === 0 && <p className="text-sm text-muted">No capabilities defined yet.</p>}
      <div className="mt-2">
        <Button size="sm" variant="ghost" onClick={() => router.refresh()}>Refresh from server</Button>
      </div>
    </div>
  );
}
