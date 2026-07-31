"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";

export default function AddReferralForm({ encounterId }: { encounterId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [toSpecialty, setToSpecialty] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/referral-consults", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ encounterId, toSpecialty, reason }),
    });
    setLoading(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Could not create referral");
      return;
    }
    setOpen(false);
    setToSpecialty("");
    setReason("");
    router.refresh();
  }

  if (!open) return <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>+ Refer / consult</Button>;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-black/10 pt-4">
      <div>
        <Label>Specialty</Label>
        <Input value={toSpecialty} onChange={(e) => setToSpecialty(e.target.value)} placeholder="e.g. Cardiology, ICU, Radiology" required />
      </div>
      <div>
        <Label>Reason</Label>
        <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Refer"}</Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
