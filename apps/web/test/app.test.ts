import { afterAll, afterEach, beforeAll, describe, expect, it } from "vite-plus/test";
import type { HabitStore } from "../src/store/habit-store.ts";
import { createStorage, openDevice, switchable, type DeviceStorage } from "./devices.ts";
import { codeSentTo, fromAndroidApp, online, startServer, type Server } from "./server.ts";

// an account of its own for each test, each under the Worker's per-address daily limit
const accounts = Array.from({ length: 10 }, (_, i) => `phone${i + 1}@example.com`);
let nextAccount = 0;

let server: Server;
beforeAll(async () => {
  server = await startServer({ allowlist: accounts });
});
afterAll(() => server?.stop());

const open: HabitStore[] = [];
afterEach(async () => {
  await Promise.all(open.splice(0).map((device) => device.close()));
});

/**
 * The Android app on a phone, opened on `storage`, reaching the server as its WebView does, over
 * a network it can lose.
 */
async function phoneApp(storage: DeviceStorage = createStorage()) {
  const network = switchable(fromAndroidApp(server));
  const phone = await openDevice(storage, network.connection, { androidApp: true });
  open.push(phone);
  return Object.assign(phone, { goOffline: network.goOffline, goOnline: network.goOnline });
}

/** The web app in a laptop's browser. */
async function laptopBrowser() {
  const laptop = await openDevice(createStorage(), online(server));
  open.push(laptop);
  return laptop;
}

/** Signs the device in to `email` with the code the server emailed. */
async function signIn(device: HabitStore, email: string) {
  await device.requestSignInCode(email);
  await device.signIn(email, codeSentTo(server, email));
}

/** A signed-in device's status: the address, with sync's progress beside it. */
const signedInAs = (email: string) => expect.objectContaining({ signedIn: true, email });

describe("the Android app", () => {
  it("signs in with an email code, and stays signed in after a restart", async () => {
    const email = accounts[nextAccount++];
    const storage = createStorage();
    const phone = await phoneApp(storage);
    await signIn(phone, email);
    const signedIn = phone.syncStatus();
    await phone.close();
    const restarted = await phoneApp(storage);
    await restarted.checkSession();
    expect([signedIn, restarted.syncStatus()]).toEqual([signedInAs(email), signedInAs(email)]);
  });

  it("brings a change on the phone to the web, and one on the web to the phone", async () => {
    const email = accounts[nextAccount++];
    const phone = await phoneApp();
    const laptop = await laptopBrowser();
    await signIn(phone, email);
    await signIn(laptop, email);
    await phone.createHabit({ kind: "build", name: "Read", color: "blue" });
    await phone.toggleDay(phone.habits()[0].id);
    await phone.sync();
    await laptop.sync();
    const onTheWeb = laptop
      .habits()
      .map((h) => ({ name: h.name, logged: h.kind === "build" && h.checkIns.length }));
    await laptop.createHabit({ kind: "build", name: "Stretch", color: "green" });
    await laptop.sync();
    await phone.sync();
    expect([onTheWeb, phone.habits().map((h) => h.name)]).toEqual([
      [{ name: "Read", logged: 1 }],
      ["Read", "Stretch"],
    ]);
  });

  it("asks before signing out loses a change, then clears the phone, signed out after a restart", async () => {
    const email = accounts[nextAccount++];
    const storage = createStorage();
    const phone = await phoneApp(storage);
    await signIn(phone, email);
    await phone.createHabit({ kind: "build", name: "Read", color: "blue" });
    await phone.sync();
    phone.goOffline();
    await phone.toggleDay(phone.habits()[0].id);
    const asked = await phone.signOut();
    phone.goOnline();
    await phone.signOut({ discardPending: true });
    await phone.close();
    const restarted = await phoneApp(storage);
    await restarted.checkSession();
    expect([asked, restarted.syncStatus(), restarted.habits()]).toEqual([
      { signedOut: false, pending: 1 },
      { signedIn: false },
      [],
    ]);
  });

  it("signs out with no server reachable, and stays signed out once it's back", async () => {
    const email = accounts[nextAccount++];
    const storage = createStorage();
    const phone = await phoneApp(storage);
    await signIn(phone, email);
    phone.goOffline();
    await phone.signOut();
    const signedOutOffline = phone.syncStatus();
    await phone.close();
    const backOnline = await phoneApp(storage);
    await backOnline.checkSession();
    await backOnline.close();
    const later = await phoneApp(storage);
    await later.checkSession();
    expect([signedOutOffline, later.syncStatus()]).toEqual([
      { signedIn: false },
      { signedIn: false },
    ]);
  });
});
