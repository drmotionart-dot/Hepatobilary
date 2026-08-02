"use client";

// Resident/admin "Mark resolved" toggle on the problem-reports table. The
// backend PATCH flips status; refresh re-renders the server table.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { apiFetch } from "@/lib/client-api";

export default function ResolveReportButton({ id, resolved }: { id: string; resolved: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await apiFetch(`/api/problem-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: resolved ? "open" : "resolved" }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant={resolved ? "ghost" : "secondary"} onClick={toggle} disabled={busy}>
      {resolved ? "Reopen" : "Mark resolved"}
    </Button>
  );
}
