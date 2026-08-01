"use client";

// Onboarding tour (spec 14). Lives in the ROOT layout (not AppShell, which
// remounts per page) so it survives navigation. On first login it auto-opens a
// role-aware tour that navigates the real app and spotlights real elements;
// it can be relaunched any time via the "Tour guide" button (window event) or
// by clicking the same helper. Steps are bundled offline (tour-steps.ts) and
// the only read is one /api/auth/me call for role + capabilities + completion.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { apiFetch } from "@/lib/client-api";
import { buildTourSteps, type TourStep } from "@/components/tour/tour-steps";

type Rect = { top: number; left: number; width: number; height: number };

const RELAUNCH_EVENT = "hpb:relaunch-tour";
const DISMISS_KEY = "hpb-tour-dismissed";

function toRect(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export default function OnboardingTour() {
  const router = useRouter();
  const pathname = usePathname();

  const [profile, setProfile] = useState<{ role: "intern" | "resident" | "admin"; grantedCapabilities?: string[] } | null>(null);
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [target, setTarget] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);
  const checkTimer = useRef<number | null>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const steps = useMemo(() => (profile ? buildTourSteps(profile) : []), [profile]);
  const step: TourStep | undefined = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  const finish = useCallback(() => {
    setActive(false);
    setTarget(null);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    apiFetch("/api/auth/tour-complete", { method: "POST" }).catch(() => {});
  }, []);

  // One lightweight session read (spec 14.2). Auto-opens the first time unless
  // the server already has tourCompletedAt or the user dismissed it locally.
  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (cancelled || !d?.user) return;
        const u = d.user;
        if (!["intern", "resident", "admin"].includes(u.role)) return;
        setProfile({ role: u.role, grantedCapabilities: u.grantedCapabilities });
        const completed = Boolean(u.tourCompletedAt);
        let dismissed = false;
        try {
          dismissed = localStorage.getItem(DISMISS_KEY) === "1";
        } catch {}
        if (!completed && !dismissed && !u.mustChangePassword) setActive(true);
      })
      .catch(() => {});
    function onRelaunch() {
      // TopBar "Tour guide" button. If the profile isn't loaded yet, refetch.
      if (!profileRef.current) {
        apiFetch("/api/auth/me")
          .then((res) => (res.ok ? res.json() : null))
          .then((d) => {
            if (!d?.user) return;
            setProfile({ role: d.user.role, grantedCapabilities: d.user.grantedCapabilities });
            setStepIndex(0);
            setActive(true);
          })
          .catch(() => {});
      } else {
        setStepIndex(0);
        setActive(true);
      }
    }
    window.addEventListener(RELAUNCH_EVENT, onRelaunch);
    return () => {
      cancelled = true;
      window.removeEventListener(RELAUNCH_EVENT, onRelaunch);
    };
  }, []);

  const spotlight = useCallback(() => {
    if (!step) {
      setTarget(null);
      setReady(true);
      return;
    }
    if (!step.selector) {
      setTarget(null);
      setReady(true);
      return;
    }
    if (pathname !== step.path) return;
    const el = document.querySelector<HTMLElement>(step.selector);
    if (!el) {
      setTarget(null);
      setReady(true);
      return;
    }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    // Wait for the scroll to settle before measuring.
    window.setTimeout(() => {
      const rect = toRect(el);
      if (rect.width === 0 && rect.height === 0) {
        setTarget(null);
      } else {
        setTarget(rect);
      }
      setReady(true);
    }, 350);
  }, [step, pathname]);

  // Navigate when the next step targets another page, then spotlight.
  useEffect(() => {
    if (!active || !step) return;
    setReady(false);
    setTarget(null);
    if (step.path !== pathname) {
      router.push(step.path);
      return;
    }
    if (checkTimer.current) window.clearTimeout(checkTimer.current);
    checkTimer.current = window.setTimeout(spotlight, 250);
  }, [active, stepIndex, pathname, step, router, spotlight]);

  useEffect(() => {
    function onResize() {
      if (active && step?.selector) spotlight();
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active, step, spotlight]);

  function next() {
    if (isLast) {
      finish();
      return;
    }
    setStepIndex((i) => i + 1);
  }

  if (!active || !step || !ready) return null;

  // Position the tooltip card near the spotlighted element.
  let cardStyle: React.CSSProperties = { top: 0, left: 0 };
  let cardClass = "fixed z-[101] w-[min(20rem,calc(100vw-2rem))]";
  if (target) {
    const gap = 12;
    const below = target.top + target.height + gap;
    const spaceBelow = window.innerHeight - below;
    const cardHeight = 190;
    const top = spaceBelow > cardHeight ? below : Math.max(8, target.top - cardHeight - gap);
    const left = Math.min(Math.max(8, target.left), window.innerWidth - 340);
    cardStyle = { top, left };
  } else {
    cardClass = "fixed z-[101] w-[min(24rem,calc(100vw-2rem))]";
    cardStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }

  return (
    <>
      {/* Spotlight: the deep box-shadow around the target-sized box dims the
          rest of the screen while leaving the target fully visible. */}
      {target ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[100]"
          style={{
            top: target.top,
            left: target.left,
            width: target.width,
            height: target.height,
            boxShadow: "0 0 0 9999px rgba(9, 12, 16, 0.6), 0 0 0 2px rgba(14, 92, 86, 0.9)",
          }}
        />
      ) : (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[100] bg-black/55" />
      )}

      <div role="dialog" aria-modal="true" aria-label={step.title} className={cardClass} style={cardStyle}>
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-2xl">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
              Tour — {stepIndex + 1} of {steps.length}
            </span>
            <span className="text-[11px] text-muted">{profile?.role}</span>
          </div>
          <h2 className="text-sm font-semibold text-ink">{step.title}</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">{step.body}</p>
          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={finish}
              className="text-xs font-medium text-muted hover:text-ink"
            >
              Skip tour
            </button>
            <Button size="sm" onClick={next}>
              {isLast ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
