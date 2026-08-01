"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { apiFetch, setToken, clearToken } from "@/lib/client-api";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const res = await apiFetch("/api/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not change password");
      return;
    }

    // The backend issues a fresh token with mustChangePassword cleared.
    if (data.token) setToken(data.token);

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-sm border border-border">
        <h1 className="text-lg font-semibold text-primary mb-1">Change password</h1>
        <p className="text-sm text-muted mb-6">
          Set a new password for your account. Minimum 8 characters.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="current">Current password</Label>
            <Input id="current" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="new">New password</Label>
            <Input id="new" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <Button type="submit" loading={loading}>
            {loading ? "Saving…" : "Save new password"}
          </Button>
        </form>

        <button
          onClick={() => {
            clearToken();
            router.push("/login");
          }}
          className="mt-4 text-xs text-muted hover:text-ink/80"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}
