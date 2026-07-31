"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { LAB_CATEGORIES } from "@/lib/constants";

export default function AddLabEntryForm({ encounterId }: { encounterId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [test, setTest] = useState("");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState("Others");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/lab-panels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ encounterId, test, value, category, date: date || undefined }),
    });
    setLoading(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Could not save result");
      return;
    }
    setOpen(false);
    setTest("");
    setValue("");
    router.refresh();
  }

  if (!open) return <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>+ Add result</Button>;

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 border-t border-black/10 pt-4">
      <div>
        <Label>Test</Label>
        <Input value={test} onChange={(e) => setTest(e.target.value)} placeholder="e.g. ALT" required />
      </div>
      <div>
        <Label>Value</Label>
        <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. 45" required />
      </div>
      <div>
        <Label>Category</Label>
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          {LAB_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </Select>
      </div>
      <div>
        <Label>Date</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {error && <p className="text-xs text-danger sm:col-span-4">{error}</p>}

      <div className="flex gap-2 sm:col-span-4">
        <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Save result"}</Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
