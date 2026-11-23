import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { codeSentTo, startWorker, type RunningWorker } from "./worker.ts";

const owner = "owner@example.com";
// addresses of their own, so one test's attempts don't count against another's
const someone = "someone@example.com";
const other = "other@example.com";

let worker: RunningWorker;
beforeAll(async () => {
  worker = await startWorker(
    { "index.html": "<!doctype html>" },
    { allowlist: [owner, someone, other] },
  );
});
afterAll(() => worker?.stop());

/**
 * A POST from a page on the app's own origin, the only origin the Worker trusts for now, from
 * the client address `ip` (Cloudflare's cf-connecting-ip).
 */
const post = (path: string, body: object, ip = "203.0.113.1") =>
  fetch(new URL(path, worker.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: worker.url.origin,
      "cf-connecting-ip": ip,
    },
    body: JSON.stringify(body),
  });

/** A different client address for each request, as an attacker with many addresses has. */
let nextAddress = 0;
const anotherIp = () => `198.51.100.${++nextAddress}`;

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

describe("guessing a sign-in code from many addresses", () => {
  it("stops sending codes to an address after ten in a day, whatever IP asks", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      const res = await post(
        "/api/auth/email-otp/send-verification-otp",
        { email: someone, type: "sign-in" },
        anotherIp(),
      );
      statuses.push(res.status);
    }
    expect([statuses.slice(0, 10).every((s) => s === 200), statuses[10]]).toEqual([true, 429]);
  });

  it("stops sign-in tries for an address after twenty in a day, whatever IP tries", async () => {
    await post("/api/auth/email-otp/send-verification-otp", { email: other, type: "sign-in" });
    for (let i = 0; i < 20; i++) {
      await post("/api/auth/sign-in/email-otp", { email: other, otp: "000000" }, anotherIp());
    }
    const res = await post(
      "/api/auth/sign-in/email-otp",
      { email: other, otp: codeSentTo(worker, other) },
      anotherIp(),
    );
    expect(res.status).toBe(429);
  });
});

describe("ways to test a code without signing in", () => {
  it.each(["/api/auth/email-otp/check-verification-otp", "/api/auth/email-otp/verify-email"])(
    "are switched off, so guessing has only sign-in's capped route (%s)",
    async (path) => {
      const res = await post(path, { email: owner, otp: "000000", type: "sign-in" }, anotherIp());
      expect(res.status).toBe(404);
    },
  );
});
