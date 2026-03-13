/**
 * useTestMode hook
 * Reads and reactively tracks the test accounts toggle state from localStorage.
 * Syncs across all admin pages via the "testAccountsChanged" custom event.
 */
import { useState, useEffect } from "react";
import { getIncludeTestAccounts } from "@/components/AdminHeader";

export function useTestMode() {
  const [includeTestAccounts, setIncludeTestAccounts] = useState<boolean>(getIncludeTestAccounts);

  useEffect(() => {
    const handler = (e: Event) => {
      setIncludeTestAccounts((e as CustomEvent<boolean>).detail);
    };
    window.addEventListener("testAccountsChanged", handler);
    return () => window.removeEventListener("testAccountsChanged", handler);
  }, []);

  return includeTestAccounts;
}
