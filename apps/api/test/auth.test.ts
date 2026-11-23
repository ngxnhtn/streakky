import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { codeSentTo, startWorker, type RunningWorker } from "./worker.ts";

const owner = "owner@example.com";

let worker: RunningWorker;
beforeAll(async () => {
  worker = await startWorker({ "index.html": "<!doctype html>" }, { allowlist: [owner] });
});
afterAll(() => worker?.stop());

/** A POST from a page on the app's own origin, the only origin the Worker trusts for now. */
const post = (path: string, body: object) =>
  fetch(new URL(path, worker.url), {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: worker.url.origin },
    body: JSON.stringify(body),
  });

const getSession = (token: string | null) =>
  fetch(new URL("/api/auth/get-session", worker.url), {
    headers: { Authorization: `Bearer ${token}` },
  });

describe("signing in without cookies, as the Android app will", () => {
  it("returns a session token that signs later requests in", async () => {
    await post("/api/auth/email-otp/send-verification-otp", { email: owner, type: "sign-in" });
    const otp = codeSentTo(worker, owner);
    const signIn = await post("/api/auth/sign-in/email-otp", { email: owner, otp });
    const session = await getSession(signIn.headers.get("set-auth-token"));
    expect(await session.json()).toMatchObject({ user: { email: owner } });
  });

  it("signs nothing in with a made-up token", async () => {
    const session = await getSession("made-up.token");
    expect(await session.json()).toBeNull();
  });
});
