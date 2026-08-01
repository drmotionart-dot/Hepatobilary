"use client";

import Button from "@/components/ui/Button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-ink">Something went wrong</h1>
        <p className="mt-2 text-sm text-ink/50">An unexpected error occurred while loading this page.</p>
        <div className="mt-4">
          <Button type="button" onClick={() => reset()}>Try again</Button>
        </div>
      </div>
    </div>
  );
}
