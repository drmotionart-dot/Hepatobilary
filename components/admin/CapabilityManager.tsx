"use client";

// Granular capability grants (spec 11.7/11.8). Toggle checkboxes are set-semantics:
// the whole list is PUT on every change, so toggling reflects immediately. The
// backend re-reads the user fresh, so a grant takes effect for the intern on
// their next gated action — no re-login required.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { apiFetch, invalidateCapabilitiesCache } from "@/lib/client-api";
import { CAPABILITY_OPTIONS } from "@/lib/models/types";
import type { Capability } from "@/lib/models/types";

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
      invalidateCapabilitiesCache();
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

  const allSelected = CAPABILITY_OPTIONS.every((c) => draft.includes(c.key));

  function toggleAll() {
    const next = allSelected ? [] : CAPABILITY_OPTIONS.map((c) => c.key);
    setDraft(next);
    void save(next);
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={allSelected} disabled={saving} onChange={toggleAll} />
          <span className="font-medium">{allSelected ? "Clear all" : "Select all"}</span>
        </label>
        <span className="text-xs text-muted">({draft.length}/{CAPABILITY_OPTIONS.length} granted)</span>
      </div>
      <div className="flex flex-col gap-2">
        {CAPABILITY_OPTIONS.map((c) => {
          const on = draft.includes(c.key);
          return (
            <label key={c.key} className={`flex items-start gap-2 rounded-lg border p-2.5 text-sm transition-colors ${on ? "border-primary/40 bg-primary/5" : "border-border"}`}>
              <input
                type="checkbox"
                checked={on}
                disabled={saving}
                onChange={() => toggle(c.key)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">{c.label}</span>
                <span className="block text-xs text-muted">{c.description}</span>
              </span>
            </label>
          );
        })}
      </div>
      {saving && <p className="mt-2 text-xs text-muted">Saving…</p>}
      {message && <p className="mt-2 text-xs text-success">{message}</p>}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      {CAPABILITY_OPTIONS.length === 0 && <p className="text-sm text-muted">No capabilities defined yet.</p>}
      <div className="mt-2">
        <Button size="sm" variant="ghost" onClick={() => router.refresh()}>Refresh from server</Button>
      </div>
    </div>
  );
}
