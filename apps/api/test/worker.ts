import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { get } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createTestHarness, experimental_readRawConfig } from "wrangler";

const apiRoot = fileURLToPath(new URL("..", import.meta.url));

/** A web app build: file contents by path, relative to the build's root. */
export type AppBuild = Record<string, string>;

/** The API Worker running in the Workers runtime, reachable from the test over HTTP. */
export type RunningWorker = {
  /** Sends a GET over HTTP to `path` on the Worker's local address, as a script's fetch does. */
  fetch: (path: string) => Promise<Response>;
  /** Opens `path` the way a browser does when a person goes to it. */
  navigate: (path: string) => Promise<Response>;
  stop: () => Promise<void>;
};

/**
 * Starts the real API Worker, as configured in `wrangler.jsonc`, in the local Workers runtime.
 * It gets a fresh in-memory D1 with every migration applied, and serves `appBuild` in place of
 * the web app's build, so tests don't depend on the web app having been built.
 */
export async function startWorker(appBuild: AppBuild): Promise<RunningWorker> {
  const appDir = await writeAppBuild(appBuild);
  const { rawConfig } = experimental_readRawConfig({ config: join(apiRoot, "wrangler.jsonc") });
  const harness = createTestHarness({
    root: apiRoot,
    workers: [{ config: { ...rawConfig, assets: { ...rawConfig.assets, directory: appDir } } }],
  });
  const { url } = await harness.listen();
  await harness.getWorker().applyD1Migrations("DB");
  return {
    fetch: (path) => fetch(new URL(path, url)),
    navigate: (path) => navigate(new URL(path, url)),
    stop: async () => {
      await harness.close();
      await rm(appDir, { recursive: true, force: true });
    },
  };
}

/**
 * A browser navigation carries `Sec-Fetch-Mode: navigate`, which decides how Cloudflare routes
 * it. Node's fetch overwrites that header with its own mode, so this sends the request raw.
 */
function navigate(url: URL): Promise<Response> {
  return new Promise((resolve, reject) => {
    const headers = { "Sec-Fetch-Mode": "navigate", Accept: "text/html" };
    get(url, { headers }, (message) => {
      const chunks: Buffer[] = [];
      message.on("data", (chunk: Buffer) => chunks.push(chunk));
      message.on("end", () => {
        const body = chunks.length > 0 ? Buffer.concat(chunks) : null;
        const responseHeaders = new Headers();
        for (const [name, value] of Object.entries(message.headers)) {
          if (typeof value === "string") responseHeaders.set(name, value);
        }
        resolve(new Response(body, { status: message.statusCode, headers: responseHeaders }));
      });
      message.on("error", reject);
    }).on("error", reject);
  });
}

async function writeAppBuild(appBuild: AppBuild): Promise<string> {
  const appDir = await mkdtemp(join(tmpdir(), "streakky-app-build-"));
  for (const [path, contents] of Object.entries(appBuild)) {
    await mkdir(dirname(join(appDir, path)), { recursive: true });
    await writeFile(join(appDir, path), contents);
  }
  return appDir;
}
