"use client";

import { useCallback, useEffect, useState } from "react";

export interface UseAgentReturn {
  paused: boolean;
  loading: boolean;
  toggle: () => Promise<void>;
}

export function useAgent(): UseAgentReturn {
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch current pause state on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/wallet/agent");
        if (!res.ok) return;
        const data: { paused: boolean } = await res.json();
        if (!cancelled) setPaused(data.paused);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Optimistic toggle: flip locally, POST the new value, reconcile with
   * the server response. Reverts on error.
   */
  const toggle = useCallback(async () => {
    if (loading) return;
    const next = !paused;
    setPaused(next); // optimistic
    setLoading(true);
    try {
      const res = await fetch("/api/wallet/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused: next }),
      });
      const data: { paused?: boolean; error?: string } = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.paused !== "boolean") {
        // Revert on failure.
        setPaused(!next);
      } else {
        setPaused(data.paused);
      }
    } catch {
      setPaused(!next); // revert on network error
    } finally {
      setLoading(false);
    }
  }, [paused, loading]);

  return { paused, loading, toggle };
}
