import { useRef, useState } from "react";

/**
 * A form's save, one at a time: a second tap while it runs does nothing, and a save that fails
 * leaves `error` for the form to show, so nothing fails silently. `saving` stays true after a
 * save goes through, so the button stays off while the sheet leaves.
 */
export function useSave(failure: string): {
  saving: boolean;
  error: string;
  /** runs `change`; true once it has gone through */
  save: (change: () => Promise<void>) => Promise<boolean>;
} {
  const running = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async (change: () => Promise<void>) => {
    if (running.current) return false;
    running.current = true;
    setSaving(true);
    setError("");
    try {
      await change();
      return true;
    } catch (cause) {
      console.error(cause);
      running.current = false;
      setSaving(false);
      setError(failure);
      return false;
    }
  };
  return { saving, error, save };
}

/** Why a save didn't go through, over the button that tries again; read out as it appears. */
export function SaveError({ children }: { children: string }) {
  return (
    <p role="alert" className="-mb-1.5 text-[0.8125rem] text-destructive empty:hidden">
      {children}
    </p>
  );
}
