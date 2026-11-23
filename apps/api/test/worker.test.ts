import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { startWorker, type RunningWorker } from "./worker.ts";

const appBuild = {
  "index.html":
    '<!doctype html><title>Streakky</title><script type="module" src="/assets/index-3f9a2c.js"></script>',
  "assets/index-3f9a2c.js": 'document.body.textContent = "Streakky";',
};

let worker: RunningWorker;
beforeAll(async () => {
  worker = await startWorker(appBuild);
});
afterAll(() => worker?.stop());

describe("the Worker serving Streakky", () => {
  it("serves the app at the root", async () => {
    const response = await worker.fetch("/");
    expect(await response.text()).toBe(appBuild["index.html"]);
  });

  it("serves the app's built files", async () => {
    const response = await worker.fetch("/assets/index-3f9a2c.js");
    expect(await response.text()).toBe(appBuild["assets/index-3f9a2c.js"]);
  });

  it("serves the app when the browser opens a path only the app knows", async () => {
    const response = await worker.navigate("/habits/h1");
    expect([response.status, await response.text()]).toEqual([200, appBuild["index.html"]]);
  });

  it("serves the app for a path only the app knows, outside browser navigation too", async () => {
    const response = await worker.fetch("/habits/h1");
    expect([response.status, await response.text()]).toEqual([200, appBuild["index.html"]]);
  });

  it("answers its health check under /api", async () => {
    const response = await worker.fetch("/api/health");
    expect([response.status, await response.json()]).toEqual([200, { ok: true }]);
  });

  it("answers under /api when the browser opens an API path, rather than serving the app", async () => {
    const response = await worker.navigate("/api/health");
    expect(await response.json()).toEqual({ ok: true });
  });

  it("answers an unknown API path with a 404, not the app", async () => {
    const response = await worker.fetch("/api/nothing-here");
    expect([response.status, await response.json()]).toEqual([404, { error: "Not found" }]);
  });
});
