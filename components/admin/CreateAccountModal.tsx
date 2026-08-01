"use client";

// Admin "create account" modal (spec 11.8 — direct account creation, including
// an intern's initial capability grants). Admin-only: the backend rejects
// residents on JSON create. Shows the generated/entered password once created
// so the admin can share it with the person.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { apiFetch } from "@/lib/client-api";
import type { Capability } from "@/lib/models/types";

const CAPABILITY_OPTIONS: { value: Capability; label: string; hint: string }[] = [
  { value: "generate-shift-key", label: "Generate shift key", hint: "May create a new ward shift key (spec 11.6/11.7)" },
];

export default function CreateAccountModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"intern" | "resident">("intern");
  const [password, setPassword] = useState("");
  const [caps, setCaps] = useState<Capability[]>([]);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ loginId: string; password: string; role: string } | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleCap(cap: Capability) {
    setCaps((prev) => (prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          role,
          password: password.trim() || undefined,
          grantedCapabilities: role === "intern" ? caps : [],
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Could not create account");
        return;
      }
      const d = await res.json();
      setCreated({ loginId: d.loginId, password: d.password || "ChangeMe123", role: d.role });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-lg">
        {created ? (
          <>
            <h3 className="text-base font-semibold">Account created</h3>
            <p className="mt-1 text-xs text-muted">Share these credentials with the person. They will be asked to change the password on first login.</p>
            <div className="mt-4 rounded-lg bg-primary/5 p-3 text-sm font-mono">
              <p><span className="text-muted">Login:</span> {created.loginId}</p>
              <p><span className="text-muted">Password:</span> {created.password}</p>
              <p><span className="text-muted">Role:</span> {created.role}</p>
            </div>
            <div className="mt-4">
              <Button onClick={onClose}>Done</Button>
            </div>
          </>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <h3 className="text-base font-semibold">Create account</h3>
            <div>
              <Label>Full name</Label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                dir="auto"
                className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Role</Label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "intern" | "resident")}
                  className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="intern">Intern</option>
                  <option value="resident">Resident</option>
                </select>
              </div>
              <div>
                <Label>Initial password</Label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="ChangeMe123"
                  className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div>
              <Label>Email <span className="text-muted">(or phone)</span></Label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <Label>Phone <span className="text-muted">(or email)</span></Label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01012345678"
                className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <p className="text-xs text-muted">At least one of email or phone is required. Email is the login; with only a phone, login is hpb{phone}.</p>

            {role === "intern" && (
              <div>
                <Label>Capabilities</Label>
                <div className="mt-1 flex flex-col gap-2">
                  {CAPABILITY_OPTIONS.map((c) => (
                    <label key={c.value} className="flex items-start gap-2 rounded-lg border border-border p-2.5 text-sm">
                      <input
                        type="checkbox"
                        checked={caps.includes(c.value)}
                        onChange={() => toggleCap(c.value)}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="font-medium">{c.label}</span>
                        <span className="block text-xs text-muted">{c.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-xs text-danger">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" loading={loading} disabled={!fullName.trim()}>
                {loading ? "Creating…" : "Create account"}
              </Button>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
