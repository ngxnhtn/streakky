import { CODE_MINUTES, type SignInCode } from "./auth.ts";

/** Resend's endpoint for sending one email. */
export const RESEND_EMAILS_URL = "https://api.resend.com/emails";

/**
 * Sends a sign-in code. With EMAIL_DELIVERY "resend" (deployed) it goes out through Resend, from
 * SIGN_IN_EMAIL_FROM; with "log" (local development) it is written to the Worker's log instead,
 * where `wrangler dev` shows it, and nothing leaves the machine.
 */
export async function sendSignInCode(env: Env, { to, code }: SignInCode): Promise<void> {
  if (env.EMAIL_DELIVERY === "log") {
    console.log(`Sign-in code for ${to}: ${code}`);
    return;
  }
  if (env.EMAIL_DELIVERY !== "resend") {
    throw new Error(`EMAIL_DELIVERY must be "resend" or "log", not "${env.EMAIL_DELIVERY}".`);
  }
  const response = await fetch(RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.SIGN_IN_EMAIL_FROM,
      to: [to],
      // the code leads the subject, so it can be read from the notification
      subject: `${code} is your Streakky sign-in code`,
      text: [
        `Your Streakky sign-in code is ${code}.`,
        `It works for ${CODE_MINUTES} minutes. If you didn't ask for it, you can ignore this email.`,
      ].join("\n\n"),
    }),
  });
  if (!response.ok) {
    throw new Error(
      `Resend didn't send the sign-in code: ${response.status} ${await response.text()}`,
    );
  }
}
