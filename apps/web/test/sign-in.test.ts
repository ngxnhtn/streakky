import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { createStorage, openDevice } from "./devices.ts";
import { codeSentTo, emailsSentTo, online, startServer, type Server } from "./server.ts";

const owner = "owner@example.com";
const partner = "partner@example.com";

let server: Server;
beforeAll(async () => {
  server = await startServer({ allowlist: [owner, partner] });
});
afterAll(() => server?.stop());

/** A device with its own storage and network address, reaching the server. */
const newDevice = () => {
  const storage = createStorage();
  return openDevice(storage, online(server));
};

describe("signing in with an email code", () => {
  it("signs an allowlisted address in with the code emailed to it", async () => {
    const device = await newDevice();
    await device.requestSignInCode(owner);
    await device.signIn(owner, codeSentTo(server, owner));
    expect(device.syncStatus()).toEqual({ signedIn: true, email: owner });
  });

  it("sends the code from Streakky's own address", async () => {
    const device = await newDevice();
    await device.requestSignInCode(partner);
    expect(emailsSentTo(server, partner).at(-1)).toMatchObject({
      from: "Streakky <sign-in@hb.nhutien.com>",
      subject: `${codeSentTo(server, partner)} is your Streakky sign-in code`,
    });
  });

  it("refuses an address that isn't on the allowlist, and sends no email at all", async () => {
    const device = await newDevice();
    const sentBefore = server.sentEmails().length;
    const refused = device.requestSignInCode("stranger@example.com");
    await expect(refused).rejects.toMatchObject({ reason: "not-allowed" });
    expect([server.sentEmails().length - sentBefore, device.syncStatus()]).toEqual([
      0,
      { signedIn: false },
    ]);
  });

  it("won't sign in an address that isn't on the allowlist, whatever the code", async () => {
    const device = await newDevice();
    const refused = device.signIn("stranger@example.com", "123456");
    await expect(refused).rejects.toMatchObject({ reason: "not-allowed" });
    expect(device.syncStatus()).toEqual({ signedIn: false });
  });

  it("matches the allowlist whatever the address's capitals", async () => {
    const device = await newDevice();
    await device.requestSignInCode("Owner@Example.com");
    await device.signIn("Owner@Example.com", codeSentTo(server, owner));
    expect(device.syncStatus()).toEqual({ signedIn: true, email: owner });
  });

  it("rejects a wrong code, and still takes the right one after it", async () => {
    const device = await newDevice();
    await device.requestSignInCode(owner);
    const code = codeSentTo(server, owner);
    const wrong = device.signIn(owner, code === "000000" ? "111111" : "000000");
    await expect(wrong).rejects.toMatchObject({ reason: "wrong-code" });
    const afterWrong = device.syncStatus();
    await device.signIn(owner, code);
    expect([afterWrong, device.syncStatus()]).toEqual([
      { signedIn: false },
      { signedIn: true, email: owner },
    ]);
  });

  it("stops taking a code after three wrong tries, from any device", async () => {
    const device = await newDevice();
    await device.requestSignInCode(owner);
    const code = codeSentTo(server, owner);
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 3; i++) await device.signIn(owner, wrong).catch(() => {});
    const again = device.signIn(owner, code);
    await expect(again).rejects.toMatchObject({ reason: "used-up-code" });
    const elsewhere = await newDevice();
    await expect(elsewhere.signIn(owner, code)).rejects.toThrow();
    expect([device.syncStatus(), elsewhere.syncStatus()]).toEqual([
      { signedIn: false },
      { signedIn: false },
    ]);
  });

  it("asks a device that keeps trying codes to wait, but not other devices", async () => {
    const device = await newDevice();
    await device.requestSignInCode(partner);
    const tries = [];
    for (let i = 0; i < 11; i++) {
      tries.push(await device.signIn(partner, "000000").catch((error) => error.reason));
    }
    const elsewhere = await newDevice();
    await elsewhere.requestSignInCode(partner);
    await elsewhere.signIn(partner, codeSentTo(server, partner));
    expect([tries.at(-1), elsewhere.syncStatus()]).toEqual([
      "rate-limited",
      { signedIn: true, email: partner },
    ]);
  });

  it("asks a device that requests codes too often to wait, but not other devices", async () => {
    const device = await newDevice();
    for (let i = 0; i < 3; i++) await device.requestSignInCode(owner);
    const fourth = device.requestSignInCode(owner);
    await expect(fourth).rejects.toMatchObject({ reason: "rate-limited" });
    const elsewhere = await newDevice();
    await expect(elsewhere.requestSignInCode(owner)).resolves.toBeUndefined();
  });

  it("says so when the server can't be reached", async () => {
    const device = await openDevice(createStorage());
    await expect(device.requestSignInCode(owner)).rejects.toMatchObject({ reason: "offline" });
  });
});

describe("a signed-in device", () => {
  const signedIn = async () => {
    const storage = createStorage();
    const device = await openDevice(storage, online(server));
    await device.requestSignInCode(owner);
    await device.signIn(owner, codeSentTo(server, owner));
    return { storage, device };
  };

  it("is still signed in after a restart", async () => {
    const { storage, device } = await signedIn();
    await device.close();
    const restarted = await openDevice(storage, online(server));
    await restarted.checkSession();
    expect(restarted.syncStatus()).toEqual({ signedIn: true, email: owner });
  });

  it("is still signed in after a restart with no server reachable", async () => {
    const { storage, device } = await signedIn();
    await device.close();
    const restarted = await openDevice(storage);
    await restarted.checkSession();
    expect(restarted.syncStatus()).toEqual({ signedIn: true, email: owner });
  });

  it("keeps its habits when it signs out", async () => {
    const { device } = await signedIn();
    await device.createHabit({ kind: "build", name: "Morning run", color: "green" });
    await device.signOut();
    expect([device.syncStatus(), device.habits().map((h) => h.name)]).toEqual([
      { signedIn: false },
      ["Morning run"],
    ]);
  });

  it("stays signed out after a restart", async () => {
    const { storage, device } = await signedIn();
    await device.signOut();
    await device.close();
    const restarted = await openDevice(storage, online(server));
    await restarted.checkSession();
    expect(restarted.syncStatus()).toEqual({ signedIn: false });
  });

  it("signs out with no server reachable, and its session ends once the server is back", async () => {
    const { storage, device } = await signedIn();
    await device.close();
    const offline = await openDevice(storage);
    await offline.signOut();
    const signedOutOffline = offline.syncStatus();
    await offline.close();
    const backOnline = await openDevice(storage, online(server));
    await backOnline.checkSession();
    await backOnline.close();
    // had the session outlived the sign-out, the server would sign this device back in
    const later = await openDevice(storage, online(server));
    await later.checkSession();
    expect([signedOutOffline, later.syncStatus()]).toEqual([
      { signedIn: false },
      { signedIn: false },
    ]);
  });
});

describe("the signed-out note", () => {
  it("isn't dismissed on a new device", async () => {
    const device = await newDevice();
    expect(device.settings().signedOutNoteDismissed).toBe(false);
  });

  it("stays dismissed after a restart, and after signing in and out", async () => {
    const storage = createStorage();
    const device = await openDevice(storage, online(server));
    device.changeSettings({ signedOutNoteDismissed: true });
    await device.close();
    const restarted = await openDevice(storage, online(server));
    await restarted.requestSignInCode(partner);
    await restarted.signIn(partner, codeSentTo(server, partner));
    await restarted.signOut();
    expect(restarted.settings().signedOutNoteDismissed).toBe(true);
  });
});
