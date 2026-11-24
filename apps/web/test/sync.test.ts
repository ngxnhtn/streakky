import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { addDays, streaksOf, toISO, todayISO, type ColorId, type Habit } from "@streakky/core";
import type { HabitRecord, HabitStore } from "../src/store/habit-store.ts";
import {
  createStorage,
  openDevice,
  storeRecords,
  withRecordsLost,
  switchable,
  type Connection,
  type DeviceOptions,
  type DeviceStorage,
} from "./devices.ts";
import { codeSentTo, online, startServer, type Server } from "./server.ts";

// an account of its own for each test, so no test sees another's habits, and each address stays
// under the Worker's per-address daily limit on sign-in codes
const accounts = Array.from({ length: 60 }, (_, i) => `person${i + 1}@example.com`);
let nextAccount = 0;

let server: Server;
beforeAll(async () => {
  server = await startServer({ allowlist: accounts });
});
afterAll(() => server?.stop());

/** A simulated device: a real habit store, and a network it can lose. */
type Device = HabitStore & { goOffline(): void; goOnline(): void };

// every test runs on Tuesday 24 November 2026, local time
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 24, 12));
});

const open: HabitStore[] = [];
afterEach(async () => {
  await Promise.all(open.splice(0).map((device) => device.close()));
  vi.useRealTimers();
});

/** A device with its own storage and network address, signed in to `email` on `at`. */
async function signedInDevice(
  email: string,
  options?: DeviceOptions,
  {
    storage = createStorage(),
    at = server,
    via = online(at),
  }: { storage?: DeviceStorage; at?: Server; via?: Connection } = {},
): Promise<Device> {
  const network = switchable(via);
  const store = await openDevice(storage, network.connection, options);
  open.push(store);
  await store.requestSignInCode(email);
  await store.signIn(email, codeSentTo(at, email));
  return Object.assign(store, { goOffline: network.goOffline, goOnline: network.goOnline });
}

/** Two devices, such as a phone and a laptop, signed in to one new account. */
async function twoDevices(
  options: [DeviceOptions?, DeviceOptions?] = [],
): Promise<[Device, Device]> {
  const email = accounts[nextAccount++];
  return [await signedInDevice(email, options[0]), await signedInDevice(email, options[1])];
}

/** Both devices sync, then the first again, as they would over a few minutes. */
async function syncBoth(a: Device, b: Device) {
  await a.sync();
  await b.sync();
  await a.sync();
}

const names = (device: HabitStore) => device.habits().map((h) => h.name);

/** What a person sees of each habit: its name, colour and the days logged on it. */
const shown = (device: HabitStore) =>
  device.habits().map((h: Habit) => ({
    name: h.name,
    color: h.color,
    days: h.kind === "build" ? h.checkIns : h.slips,
  }));

const daysAgo = (n: number) => toISO(addDays(todayISO(), -n));

/** A build habit as a version of the app from before sync stored it: no change ids, nothing synced. */
const storedBeforeSync = (fields: Partial<HabitRecord> = {}): HabitRecord => ({
  id: crypto.randomUUID(),
  kind: "build",
  name: "Read",
  color: "blue",
  goal: null,
  quitDay: null,
  archived: false,
  order: "a0",
  deleted: false,
  edited: { name: 1, color: 1, goal: 1, quitDay: 1, archived: 1, order: 1 },
  ...fields,
});

/** A clock the test moves on, which devices read for their edit times. */
function testClock() {
  let time = Date.parse("2026-11-24T12:00:00Z");
  return {
    now: () => time,
    /** an edit a minute after the last one */
    tick: () => void (time += 60_000),
  };
}

/** Two devices offline after both have synced `setUp`, which the first device makes. */
async function apartAfter(
  setUp: (phone: Device) => Promise<void>,
  options?: [DeviceOptions?, DeviceOptions?],
) {
  const [phone, laptop] = await twoDevices(options);
  await setUp(phone);
  await syncBoth(phone, laptop);
  phone.goOffline();
  laptop.goOffline();
  return [phone, laptop] as const;
}

async function together(phone: Device, laptop: Device) {
  phone.goOnline();
  laptop.goOnline();
  await syncBoth(phone, laptop);
}

describe("syncing between two signed-in devices", () => {
  it("brings a habit made on one device to the other", async () => {
    const [phone, laptop] = await twoDevices();
    await phone.createHabit({ kind: "build", name: "Morning run", color: "green" });
    await phone.sync();
    await laptop.sync();
    expect(names(laptop)).toEqual(["Morning run"]);
  });

  it("brings both devices' offline edits together once both sync", async () => {
    const [phone, laptop] = await twoDevices();
    await phone.createHabit({ kind: "build", name: "Morning run", color: "green" });
    await syncBoth(phone, laptop);
    phone.goOffline();
    laptop.goOffline();
    await phone.toggleDay(phone.habits()[0].id, daysAgo(1));
    await laptop.createHabit({ kind: "quit", name: "No sugar", color: "red", quitDay: daysAgo(9) });
    await syncBoth(phone, laptop);
    phone.goOnline();
    laptop.goOnline();
    await syncBoth(phone, laptop);
    const expected = [
      { name: "Morning run", color: "green", days: [daysAgo(1)] },
      { name: "No sugar", color: "red", days: [] },
    ];
    expect([shown(phone), shown(laptop)]).toEqual([expected, expected]);
  });

  it("lets the later edit win when both devices change the same day offline", async () => {
    const clock = testClock();
    const [phone, laptop] = await apartAfter(
      (phone) => phone.createHabit({ kind: "build", name: "Read", color: "blue" }),
      [{ now: clock.now }, { now: clock.now }],
    );
    const id = phone.habits()[0].id;
    // the third day back: checked in on the phone, then on the laptop, which is later
    await phone.toggleDay(id, daysAgo(3));
    clock.tick();
    await laptop.toggleDay(id, daysAgo(3));
    // the second day back: checked in on the laptop, then on the phone, then undone there
    clock.tick();
    await laptop.toggleDay(id, daysAgo(2));
    clock.tick();
    await phone.toggleDay(id, daysAgo(2));
    clock.tick();
    await phone.toggleDay(id, daysAgo(2));
    await together(phone, laptop);
    const expected = [{ name: "Read", color: "blue", days: [daysAgo(3)] }];
    expect([shown(phone), shown(laptop)]).toEqual([expected, expected]);
  });

  it("keeps a rename on one device and a colour change on the other", async () => {
    const clock = testClock();
    const [phone, laptop] = await apartAfter(
      (phone) => phone.createHabit({ kind: "build", name: "Read", color: "blue" }),
      [{ now: clock.now }, { now: clock.now }],
    );
    const id = phone.habits()[0].id;
    clock.tick();
    await phone.editHabit(id, { name: "Read a chapter" });
    clock.tick();
    await laptop.editHabit(id, { color: "ochre" });
    await together(phone, laptop);
    const expected = [{ name: "Read a chapter", color: "ochre", days: [] }];
    expect([shown(phone), shown(laptop)]).toEqual([expected, expected]);
  });

  it("keeps a deleted habit deleted, whatever the other device did to it meanwhile", async () => {
    const clock = testClock();
    const [phone, laptop] = await apartAfter(
      async (phone) => {
        await phone.createHabit({ kind: "build", name: "Read", color: "blue" });
        await phone.createHabit({ kind: "build", name: "Stretch", color: "green" });
      },
      [{ now: clock.now }, { now: clock.now }],
    );
    const id = phone.habits()[0].id;
    await phone.deleteHabit(id);
    // later than the delete: a rename and a new check-in on the laptop
    clock.tick();
    await laptop.editHabit(id, { name: "Read more" });
    await laptop.toggleDay(id);
    await together(phone, laptop);
    expect([names(phone), names(laptop)]).toEqual([["Stretch"], ["Stretch"]]);
  });

  it("counts a quit habit the same on both after a quit-day move and an offline slip before it", async () => {
    const clock = testClock();
    const [phone, laptop] = await apartAfter(
      (phone) =>
        phone.createHabit({ kind: "quit", name: "No sugar", color: "red", quitDay: daysAgo(20) }),
      [{ now: clock.now }, { now: clock.now }],
    );
    const id = phone.habits()[0].id;
    // the laptop logs a slip 15 days back; the phone moves the quit day to 10 days back
    await laptop.toggleDay(id, daysAgo(15));
    clock.tick();
    await phone.moveQuitDay(id, daysAgo(10));
    await together(phone, laptop);
    const counted = (device: Device) => {
      const habit = device.habits()[0];
      return { quitDay: habit.kind === "quit" && habit.quitDay, streak: streaksOf(habit).at(-1) };
    };
    // the slip before the new quit day doesn't count: 10 clean days on both
    expect(counted(laptop)).toEqual(counted(phone));
    expect(counted(phone)).toMatchObject({ quitDay: daysAgo(10), streak: { days: 10 } });
  });

  it("brings a reorder to the other device", async () => {
    const [phone, laptop] = await apartAfter(async (phone) => {
      for (const name of ["Read", "Stretch", "Walk"]) {
        await phone.createHabit({ kind: "build", name, color: "blue" });
      }
    });
    phone.goOnline();
    laptop.goOnline();
    const [read, , walk] = phone.habits();
    await phone.moveHabit(walk.id, null);
    await phone.moveHabit(read.id, walk.id);
    await syncBoth(phone, laptop);
    expect([names(phone), names(laptop)]).toEqual([
      ["Walk", "Read", "Stretch"],
      ["Walk", "Read", "Stretch"],
    ]);
  });

  it("moves a habit between two that the devices added offline after the same one", async () => {
    const [phone, laptop] = await apartAfter((phone) =>
      phone.createHabit({ kind: "build", name: "Read", color: "blue" }),
    );
    // each adds a habit at the end, just after "Read": both take the same position
    await phone.createHabit({ kind: "build", name: "Stretch", color: "green" });
    await laptop.createHabit({ kind: "build", name: "Walk", color: "ochre" });
    await together(phone, laptop);
    const [read, first, second] = phone.habits();
    await phone.moveHabit(read.id, first.id);
    await syncBoth(phone, laptop);
    const expected = [first.name, "Read", second.name];
    expect([names(phone), names(laptop)]).toEqual([expected, expected]);
  });

  it("agrees on one result when the devices' clocks differ, by the times they recorded", async () => {
    const clock = testClock();
    // the laptop's clock runs ten minutes fast
    const fast = () => clock.now() + 10 * 60_000;
    const [phone, laptop] = await apartAfter(
      (phone) => phone.createHabit({ kind: "build", name: "Read", color: "blue" }),
      [{ now: clock.now }, { now: fast }],
    );
    const id = phone.habits()[0].id;
    await laptop.editHabit(id, { name: "Read on the laptop" });
    // five minutes later by the phone's clock, still earlier than the laptop's
    for (let i = 0; i < 5; i++) clock.tick();
    await phone.editHabit(id, { name: "Read on the phone" });
    // the phone pushes last, so only the recorded times can make the laptop's edit win
    await together(laptop, phone);
    expect([names(phone), names(laptop)]).toEqual([["Read on the laptop"], ["Read on the laptop"]]);
  });

  it("counts an archived quit habit the same on both when they archived it differently", async () => {
    const clock = testClock();
    const [phone, laptop] = await apartAfter(
      (phone) =>
        phone.createHabit({ kind: "quit", name: "No sugar", color: "red", quitDay: daysAgo(10) }),
      [{ now: clock.now }, { now: clock.now }],
    );
    const id = phone.habits()[0].id;
    // the phone archives and restores; the laptop, offline, archives later
    await phone.archiveHabit(id);
    clock.tick();
    await phone.restoreHabit(id);
    clock.tick();
    await laptop.archiveHabit(id);
    await together(phone, laptop);
    const archived = (device: Device) =>
      device.archivedHabits().map((h) => ({ name: h.name, streak: streaksOf(h).at(-1)?.days }));
    expect([names(phone), archived(phone)]).toEqual([[], [{ name: "No sugar", streak: 10 }]]);
    expect([names(laptop), archived(laptop)]).toEqual([names(phone), archived(phone)]);
  });

  it("doesn't let a push sent again undo a later edit from the other device", async () => {
    const clock = testClock();
    const email = accounts[nextAccount++];
    // The phone's first push reaches the server, but the network drops before the answer comes
    // back, and stays down for the rest of that sync: the phone hears nothing of what the server
    // stored, so everything it pushed still waits, and its next sync sends the same push again.
    let lose = true;
    let dropNetwork = () => {};
    const losesFirstPushAnswer: Connection = (storage) => {
      const reach = online(server)(storage);
      return async (path, init) => {
        const response = await reach(path, init);
        if (path.endsWith("/push") && lose) {
          lose = false;
          dropNetwork();
          throw new TypeError("fetch failed");
        }
        return response;
      };
    };
    const phone = await signedInDevice(email, { now: clock.now }, { via: losesFirstPushAnswer });
    const laptop = await signedInDevice(email, { now: clock.now });
    dropNetwork = () => phone.goOffline();
    await phone.createHabit({ kind: "build", name: "Read", color: "blue" });
    await phone.toggleDay(phone.habits()[0].id, daysAgo(1));
    await phone.sync();
    const waiting = phone.syncStatus();
    await laptop.sync();
    // later, the laptop renames the habit and takes the check-in back
    clock.tick();
    const id = laptop.habits()[0].id;
    await laptop.editHabit(id, { name: "Read a chapter" });
    await laptop.toggleDay(id, daysAgo(1));
    await laptop.sync();
    phone.goOnline();
    await syncBoth(phone, laptop);
    const expected = [{ name: "Read a chapter", color: "blue", days: [] }];
    expect(waiting).toMatchObject({ pending: 2, failing: true });
    expect([shown(phone), shown(laptop)]).toEqual([expected, expected]);
  });

  it("syncs a long history, more than one push or pull carries", async () => {
    const email = accounts[nextAccount++];
    const storage = createStorage();
    const id = "long-history";
    const days = Array.from({ length: 1200 }, (_, i) => daysAgo(i + 1));
    // years of check-ins, kept from before this device synced
    await storeRecords(storage, {
      habits: [storedBeforeSync({ id, name: "Read" })],
      days: days.map((day) => ({ habitId: id, day, logged: true, edited: 1 })),
    });
    const phone = await signedInDevice(email, {}, { storage });
    const laptop = await signedInDevice(email);
    await syncBoth(phone, laptop);
    const checkIns = (device: Device) => {
      const habit = device.habits()[0];
      return habit?.kind === "build" ? habit.checkIns.length : 0;
    };
    expect([checkIns(phone), checkIns(laptop)]).toEqual([1200, 1200]);
  });

  // records no version of the app writes, which the server refuses to store
  it.each<[string, Partial<HabitRecord>]>([
    ["a colour the server can't take", { color: "Not a colour" as ColorId }],
    ["a quit habit with no quit day", { kind: "quit", quitDay: null }],
    ["a build habit with a quit day", { kind: "build", quitDay: daysAgo(10) }],
  ])("keeps syncing the rest when the server can't read one record: %s", async (_, odd) => {
    const email = accounts[nextAccount++];
    const storage = createStorage();
    await storeRecords(storage, { habits: [storedBeforeSync({ name: "Odd one", ...odd })] });
    const phone = await signedInDevice(email, {}, { storage });
    const laptop = await signedInDevice(email);
    await phone.createHabit({ kind: "build", name: "Read", color: "blue" });
    await laptop.createHabit({ kind: "build", name: "Stretch", color: "green" });
    await syncBoth(phone, laptop);
    expect(names(laptop).toSorted()).toEqual(["Read", "Stretch"]);
    expect(names(phone)).toEqual(expect.arrayContaining(["Read", "Stretch"]));
    // the one record stays waiting on the phone; the rest went through
    expect(phone.syncStatus()).toMatchObject({ pending: 1, failing: false });
  });

  it("doesn't celebrate a goal another device set, or reached by moving a quit day", async () => {
    const [phone, laptop] = await twoDevices();
    await phone.createHabit({ kind: "build", name: "Read", color: "blue" });
    await phone.createHabit({
      kind: "quit",
      name: "No sugar",
      color: "red",
      quitDay: daysAgo(3),
      goal: 7,
    });
    const [read, noSugar] = phone.habits();
    for (let n = 6; n >= 0; n--) await phone.toggleDay(read.id, daysAgo(n));
    await syncBoth(phone, laptop);
    // the phone sets a goal that the 7-day streak already reaches, and moves a quit day back far
    // enough to reach the goal
    await phone.editHabit(read.id, { goal: 7 });
    await phone.moveQuitDay(noSugar.id, daysAgo(10));
    await syncBoth(phone, laptop);
    const due = (device: Device) => device.habits().map((habit) => device.celebrationDue(habit));
    expect([due(phone), due(laptop)]).toEqual([
      [false, false],
      [false, false],
    ]);
  });

  it("doesn't celebrate a habit that arrives from another device with its goal reached", async () => {
    const [phone, laptop] = await twoDevices();
    await phone.createHabit({
      kind: "quit",
      name: "No sugar",
      color: "red",
      quitDay: daysAgo(20),
      goal: 14,
    });
    await syncBoth(phone, laptop);
    expect(laptop.habits().map((habit) => laptop.celebrationDue(habit))).toEqual([false]);
  });

  it("never shows one account's habits to another", async () => {
    const [mine] = await twoDevices();
    const [theirs] = await twoDevices();
    await mine.createHabit({ kind: "build", name: "Read", color: "blue" });
    await mine.sync();
    await theirs.sync();
    expect(names(theirs)).toEqual([]);
  });
});

describe("a device whose place in the account's changes no longer fits", () => {
  it("gets every habit again once its stored habits are lost", async () => {
    const email = accounts[nextAccount++];
    const storage = createStorage();
    const phone = await signedInDevice(email, {}, { storage });
    const laptop = await signedInDevice(email);
    await laptop.createHabit({ kind: "build", name: "Read", color: "blue" });
    await laptop.sync();
    await phone.sync();
    await phone.close();
    const reopened = await openDevice(withRecordsLost(storage), online(server));
    open.push(reopened);
    await reopened.sync();
    expect(names(reopened)).toEqual(["Read"]);
  });

  it("gets every habit from a server where the account's data started again", async () => {
    const email = accounts[nextAccount++];
    const storage = createStorage();
    const phone = await signedInDevice(email, {}, { storage });
    for (const name of ["Read", "Stretch", "Walk"]) {
      await phone.createHabit({ kind: "build", name, color: "blue" });
    }
    await phone.sync();
    await phone.close();
    // a new server, as when the database is made anew, where another device adds a habit
    const anew = await startServer({ allowlist: [email] });
    try {
      const laptop = await signedInDevice(email, {}, { at: anew });
      await laptop.createHabit({ kind: "build", name: "Meditate", color: "green" });
      await laptop.sync();
      // the phone saw more of the old server's changes than the new one has
      const moved = await signedInDevice(email, {}, { storage, at: anew });
      await moved.sync();
      expect(names(moved)).toContain("Meditate");
    } finally {
      await Promise.all(open.splice(0).map((device) => device.close()));
      await anew.stop();
    }
  });
});

describe("when a signed-in device syncs by itself", () => {
  it("syncs when it opens", async () => {
    const email = accounts[nextAccount++];
    const storage = createStorage();
    const phone = await signedInDevice(email);
    const laptop = await signedInDevice(email, {}, { storage });
    await laptop.close();
    await phone.createHabit({ kind: "build", name: "Read", color: "blue" });
    await phone.sync();
    const reopened = await openDevice(storage, online(server));
    open.push(reopened);
    await vi.waitFor(() => expect(names(reopened)).toEqual(["Read"]));
  });

  it("syncs a moment after a change on the device", async () => {
    const email = accounts[nextAccount++];
    const phone = await signedInDevice(email, { timing: { syncDelay: 20 } });
    const laptop = await signedInDevice(email);
    await phone.createHabit({ kind: "build", name: "Read", color: "blue" });
    await vi.waitFor(async () => {
      await laptop.sync();
      expect(names(laptop)).toEqual(["Read"]);
    });
  });

  it("syncs every so often while open", async () => {
    const email = accounts[nextAccount++];
    const phone = await signedInDevice(email);
    const laptop = await signedInDevice(email, { timing: { syncInterval: 30 } });
    await phone.createHabit({ kind: "build", name: "Read", color: "blue" });
    await phone.sync();
    await vi.waitFor(() => expect(names(laptop)).toEqual(["Read"]));
  });

  it("syncs when the platform says it's back, online or in the foreground", async () => {
    const email = accounts[nextAccount++];
    let comeBack = () => {};
    const phone = await signedInDevice(email);
    const laptop = await signedInDevice(email, {
      syncTriggers: (sync) => {
        comeBack = sync;
        return () => {};
      },
    });
    laptop.goOffline();
    await laptop.createHabit({ kind: "build", name: "Read", color: "blue" });
    laptop.goOnline();
    comeBack();
    await vi.waitFor(async () => {
      await phone.sync();
      expect(names(phone)).toEqual(["Read"]);
    });
  });
});

describe("a signed-in device's sync status", () => {
  it("counts the changes waiting to sync, and says when it last synced", async () => {
    const clock = testClock();
    const [phone] = await twoDevices([{ now: clock.now }]);
    // signing in synced once already
    await phone.sync();
    const signedInAt = clock.now();
    clock.tick();
    phone.goOffline();
    await phone.createHabit({ kind: "build", name: "Read", color: "blue" });
    await phone.toggleDay(phone.habits()[0].id);
    await phone.sync();
    const offline = phone.syncStatus();
    phone.goOnline();
    clock.tick();
    await phone.sync();
    const email = expect.any(String);
    expect([offline, phone.syncStatus()]).toEqual([
      { signedIn: true, email, pending: 2, lastSynced: signedInAt, failing: true },
      { signedIn: true, email, pending: 0, lastSynced: clock.now(), failing: false },
    ]);
  });
});

describe("the server", () => {
  it("refuses to push or pull for a device that isn't signed in", async () => {
    const pulled = await server.fetch("/api/sync/pull?since=0");
    const pushed = await fetch(new URL("/api/sync/push", server.url), {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: server.url.origin },
      body: JSON.stringify({ habits: [], days: [] }),
    });
    expect([pulled.status, pushed.status]).toEqual([401, 401]);
  });
});

describe("a signed-out device", () => {
  it("never calls sync, even with the server reachable", async () => {
    const paths: string[] = [];
    const watched: Connection = (storage) => {
      const reach = online(server)(storage);
      return (path, init) => {
        paths.push(path);
        return reach(path, init);
      };
    };
    const device = await openDevice(createStorage(), watched, {
      timing: { syncDelay: 1, syncInterval: 5 },
      syncTriggers: (sync) => {
        const timer = setInterval(sync, 5);
        return () => clearInterval(timer);
      },
    });
    open.push(device);
    await device.createHabit({ kind: "build", name: "Read", color: "blue" });
    await device.sync();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(paths.filter((path) => path.startsWith("/api/sync"))).toEqual([]);
  });
});
