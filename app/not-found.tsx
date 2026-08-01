import Link from "next/link";
import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-ink">Page not found</h1>
        <p className="mt-2 text-sm text-ink/50">The page you&apos;re looking for doesn&apos;t exist.</p>
        <div className="mt-4">
          <Link href="/dashboard">
            <Button>Go to dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
