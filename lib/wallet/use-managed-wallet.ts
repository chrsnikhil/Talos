"use client";
import { useCallback, useEffect, useState } from "react";

export function useManagedWallet() {
  const [state, setState] = useState<{ address: string | null; email: string | null; loading: boolean }>(
    { address: null, email: null, loading: true },
  );
  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const r = await fetch("/api/wallet/me");
      if (r.ok) { const { address, email } = await r.json(); setState({ address, email, loading: false }); }
      else setState({ address: null, email: null, loading: false });
    } catch { setState({ address: null, email: null, loading: false }); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { ...state, refresh };
}
