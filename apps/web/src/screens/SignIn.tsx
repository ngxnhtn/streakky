import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { AppBar } from "@streakky/ui/components/app-bar";
import { Button } from "@streakky/ui/components/button";
import { Field } from "@streakky/ui/components/field";
import { Input } from "@streakky/ui/components/input";
import { SIGN_IN_CODE, SignInError, type SignInFailure } from "../store/habit-store.ts";
import { useHabitStore } from "../store/react.tsx";
import { ScreenScroll, useNav } from "./stack.tsx";

const { length: CODE_LENGTH, minutes: CODE_MINUTES } = SIGN_IN_CODE;
/** "6-digit", kept on one line. */
const sixDigit = <span className="whitespace-nowrap">{CODE_LENGTH}-digit</span>;
/** The code step's quieter actions: full 2.75rem tap targets. */
const quietButton = "h-11 px-4 text-[0.9375rem]";

/** What went wrong, in words, under the field it concerns. */
const MESSAGES: Record<SignInFailure, string> = {
  "invalid-email": "Enter an email address, like name@example.com.",
  "not-allowed": "This address can't sign in to Streakky.",
  "wrong-code": "That code isn't right. Check the email and try again.",
  "expired-code": "That code has expired. Send a new one.",
  "used-up-code": "That code has had too many wrong tries. Send a new one.",
  "rate-limited": "Too many tries for now. Wait a minute, then try again.",
  offline: "Streakky can't be reached. Check your connection and try again.",
  server: "Something went wrong on Streakky's side. Try again.",
};

const messageOf = (error: unknown) =>
  MESSAGES[error instanceof SignInError ? error.reason : "server"];

/**
 * Signing in: an email address, then the 6-digit code emailed to it. Done, it goes back to the
 * screen it came from.
 */
export function SignIn() {
  const { pop } = useNav();
  const [email, setEmail] = useState<string | null>(null);
  // a sign-in that finishes after the person went back must not take them back a second time
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => void (mounted.current = false);
  }, []);
  const signedIn = () => {
    if (mounted.current) pop();
  };
  return (
    <>
      <AppBar
        left={
          <Button variant="ghost" size="icon" aria-label="Back" onClick={pop}>
            <ChevronLeft strokeWidth={1.75} />
          </Button>
        }
      />
      <ScreenScroll>
        <div className="px-5">
          {email === null ? (
            <EmailStep onSent={setEmail} />
          ) : (
            <CodeStep email={email} onSignedIn={signedIn} onChangeEmail={() => setEmail(null)} />
          )}
        </div>
      </ScreenScroll>
    </>
  );
}

function EmailStep({ onSent }: { onSent: (email: string) => void }) {
  const store = useHabitStore();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);
  const send = async (event: FormEvent) => {
    event.preventDefault();
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return setError(MESSAGES["invalid-email"]);
    setSending(true);
    setError(undefined);
    try {
      await store.requestSignInCode(address);
      onSent(address);
    } catch (failure) {
      setError(messageOf(failure));
      setSending(false);
    }
  };
  return (
    <Step
      title="Sign in"
      intro={<>Enter your email address, and we'll email you a {sixDigit} code.</>}
    >
      <form className="grid gap-[1.125rem]" onSubmit={send} noValidate>
        <Field label="Email" error={error}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
            />
          )}
        </Field>
        <Button type="submit" className="w-full" disabled={sending}>
          {sending ? "Sending the code…" : "Send code"}
        </Button>
      </form>
      <Announce>{error}</Announce>
    </Step>
  );
}

function CodeStep({
  email,
  onSignedIn,
  onChangeEmail,
}: {
  email: string;
  onSignedIn: () => void;
  onChangeEmail: () => void;
}) {
  const store = useHabitStore();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [note, setNote] = useState<string>();
  const [busy, setBusy] = useState(false);

  const signIn = async (digits: string) => {
    if (busy) return;
    if (digits.length !== CODE_LENGTH) return setError(`Enter all ${CODE_LENGTH} digits.`);
    setBusy(true);
    setError(undefined);
    setNote(undefined);
    try {
      await store.signIn(email, digits);
      onSignedIn();
    } catch (failure) {
      setError(messageOf(failure));
      setBusy(false);
    }
  };
  const sendAgain = async () => {
    setBusy(true);
    setError(undefined);
    setNote(undefined);
    try {
      await store.requestSignInCode(email);
      setCode("");
      setNote(`We sent a new code to ${email}.`);
    } catch (failure) {
      setError(messageOf(failure));
    }
    setBusy(false);
  };

  return (
    <Step
      title="Enter the code"
      intro={
        <>
          We emailed a {sixDigit} code to{" "}
          <span className="font-medium break-words text-foreground">{email}</span>. It works for{" "}
          {CODE_MINUTES} minutes.
        </>
      }
    >
      <form
        className="grid gap-[1.125rem]"
        onSubmit={(event) => {
          event.preventDefault();
          void signIn(code);
        }}
        noValidate
      >
        <Field label="Code" error={error}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              autoFocus
              value={code}
              onChange={(event) => {
                // no maxLength: a pasted "123 456" would lose its last digit before this runs
                const digits = event.target.value.replaceAll(/\D/g, "").slice(0, CODE_LENGTH);
                setCode(digits);
                // a whole code, typed or pasted, signs in straight away
                if (digits.length === CODE_LENGTH && digits !== code) void signIn(digits);
              }}
              className="font-mono text-xl tracking-[0.4em]"
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
            />
          )}
        </Field>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Checking…" : "Sign in"}
        </Button>
      </form>
      <div className="mt-3 flex flex-wrap justify-center gap-x-2">
        <Button
          variant="ghost"
          className={quietButton}
          disabled={busy}
          onClick={() => void sendAgain()}
        >
          Send a new code
        </Button>
        <Button variant="ghost" className={quietButton} disabled={busy} onClick={onChangeEmail}>
          Use another email
        </Button>
      </div>
      {note && <p className="mt-2 text-center text-[0.8125rem] text-muted-foreground">{note}</p>}
      <Announce>{error ?? note}</Announce>
    </Step>
  );
}

function Step({
  title,
  intro,
  children,
}: {
  title: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[26.25rem]">
      <header className="pt-1 pb-6">
        <h1 className="font-display text-4xl leading-[1.05] font-medium tracking-[-0.032em] [font-stretch:96%]">
          {title}
        </h1>
        <p className="mt-2.5 text-muted-foreground">{intro}</p>
      </header>
      {children}
    </div>
  );
}

/** Reads out an error or a confirmation as it appears, for screen readers. */
function Announce({ children }: { children?: string }) {
  return (
    <p role="status" className="sr-only">
      {children}
    </p>
  );
}
