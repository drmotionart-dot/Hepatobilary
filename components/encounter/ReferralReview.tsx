"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { apiFetch } from "@/lib/client-api";
import type { ReferralConsult } from "@/lib/models/types";

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1024;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        const scale = MAX / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

export default function ReferralReview({ referral, role }: { referral: ReferralConsult; role: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [recommendations, setRecommendations] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reviewing a consult (PATCH /api/referral-consults/[id]) is resident/admin
  // only (§7) — interns can file referrals but not close them.
  const canReview = role === "resident" || role === "admin";

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError("");
      setPhoto(await resizeImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process image");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await apiFetch(`/api/referral-consults/${referral._id!.toString()}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "reviewed",
        recommendations: recommendations.trim() || undefined,
        imageData: photo || undefined,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Could not mark referral as done");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (referral.status === "reviewed") {
    return (
      <div className="mt-2 pl-3 border-l-2 border-success/30">
        {referral.recommendations && (
          <p className="text-sm text-ink/80"><span className="font-medium">Recommendations:</span> {referral.recommendations}</p>
        )}
        {referral.imageData && (
          <button type="button" onClick={() => setExpanded(!expanded)} className="mt-2 block">
            {expanded ? (
              // eslint-disable-next-line @next/next/no-img-element -- inline data-URL (client-side resized photo) with unknown intrinsic size
              <img src={referral.imageData} alt="Referral hardcopy" className="max-h-96 rounded-lg border border-border" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- inline data-URL (client-side resized photo) with unknown intrinsic size
              <img src={referral.imageData} alt="Referral hardcopy" className="h-24 rounded-lg border border-border shadow-sm" />
            )}
          </button>
        )}
        {referral.reviewedAt && (
          <p className="text-xs text-muted mt-1">Reviewed {new Date(referral.reviewedAt).toLocaleString("en-GB")}</p>
        )}
      </div>
    );
  }

  if (!open) {
    return canReview ? (
      <div className="mt-2">
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>Mark done</Button>
      </div>
    ) : null;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-2 pl-3 border-l-2 border-pending/40 pt-2 pb-2">
      <div>
        <Label>Recommendations (from the hardcopy)</Label>
        <Textarea rows={2} value={recommendations} onChange={(e) => setRecommendations(e.target.value)} placeholder="e.g. Continue current plan, review after labs…" />
      </div>
      <div>
        <Label>Or upload a photo of the hardcopy</Label>
        <input type="file" accept="image/*" onChange={handleFile} className="text-sm" />
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- inline data-URL (client-side resized photo) with unknown intrinsic size
          <img src={photo} alt="Selected photo" className="mt-2 h-24 rounded-lg border border-border" />
        )}
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" loading={loading}>{loading ? "Saving…" : "Done"}</Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
