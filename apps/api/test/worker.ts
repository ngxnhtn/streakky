import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { get } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createTestHarness, experimental_readRawConfig } from "wrangler";

const apiRoot = fileURLToPath(new URL("..", import.meta.url));

/** A web app build: file contents by path, relative to the build's root. */
export type AppBuild = Record<string, string>;

/** An email as the Worker handed it to Resend. */
export type SentEmail = { from: string; to: string[]; subject: string; text: string };

export type WorkerOptions = {
  /** The addresses that may sign in (the SIGN_IN_ALLOWLIST var). */
  allowlist?: string[];
};

/** The API Worker running in the Workers runtime, reachable from the test over HTTP. */
export type RunningWorker = {
  /** The Worker's local address. */
  url: URL;
  /** Sends a GET over HTTP to `path` on the Worker's local address, as a script's fetch does. */
  fetch: (path: string) => Promise<Response>;
  /** Opens `path` the way a browser does when a person goes to it. */
  navigate: (path: string) => Promise<Response>;
  /** Every email this Worker has sent, oldest first. None of them leaves the machine. */
  sentEmails: () => SentEmail[];
  stop: () => Promise<void>;
};

/**
 * Starts the real API Worker, as configured in `wrangler.jsonc`, in the local Workers runtime.
 * It gets a fresh in-memory D1 with every migration applied, and serves `appBuild` in place of
 * the web app's build, so tests don't depend on the web app having been built.
 *
 * Its emails go out through Resend as when deployed, but a stand-in for Resend's API captures
 * them, so tests can read sign-in codes.
 */
export async function startWorker(
  appBuild: AppBuild,
  { allowlist = [] }: WorkerOptions = {},
): Promise<RunningWorker> {
  const appDir = await writeAppBuild(appBuild);
  const { rawConfig } = experimental_readRawConfig({ config: join(apiRoot, "wrangler.jsonc") });
  // the test's own secrets go in as vars, so nothing is read from a local .dev.vars
  const { secrets: _required, ...config } = rawConfig;
  const resendKey = `re_test_${crypto.randomUUID()}`;
  const emails: SentEmail[] = [];
  const stopCapture = captureEmails(resendKey, emails);
  const harness = createTestHarness({
    root: apiRoot,
    workers: [
      {
        config: {
          ...config,
          assets: { ...config.assets, directory: appDir },
          vars: {
            ...config.vars,
            SIGN_IN_ALLOWLIST: allowlist.join(","),
            EMAIL_DELIVERY: "resend",
            RESEND_API_KEY: resendKey,
            BETTER_AUTH_SECRET: crypto.randomUUID() + crypto.randomUUID(),
          },
        },
      },
    ],
  });
  const { url } = await harness.listen();
  await harness.getWorker().applyD1Migrations("DB");
  return {
    url,
    fetch: (path) => fetch(new URL(path, url)),
    navigate: (path) => navigate(new URL(path, url)),
    sentEmails: () => [...emails],
    stop: async () => {
      await harness.close();
      stopCapture();
      await rm(appDir, { recursive: true, force: true });
    },
  };
}

const RESEND_EMAILS_URL = "https://api.resend.com/emails";

/** Each running Worker's Resend API key, and where its emails go. */
const captures = new Map<string, SentEmail[]>();
let realFetch: typeof fetch | null = null;

/**
 * The harness sends the Worker's outgoing requests through Node's global fetch. While a Worker
 * runs, this stands in for Resend there: it answers as Resend does and keeps each email under the
 * API key that sent it, so every Worker sees only its own. Everything else, the test's own
 * requests to the Worker included, goes through to the real fetch.
 */
function captureEmails(apiKey: string, into: SentEmail[]): () => void {
  captures.set(apiKey, into);
  if (!realFetch) {
    const passThrough = globalThis.fetch;
    realFetch = passThrough;
    globalThis.fetch = async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url !== RESEND_EMAILS_URL) return passThrough(input, init);
      const request = new Request(input, init);
      const apiKey = request.headers.get("Authorization")?.replace(/^Bearer /, "") ?? "";
      const inbox = captures.get(apiKey);
      if (!inbox) {
        return Response.json(
          { statusCode: 401, name: "validation_error", message: "API key is invalid" },
          { status: 401 },
        );
      }
      inbox.push((await request.json()) as SentEmail);
      return Response.json({ id: crypto.randomUUID() });
    };
  }
  return () => {
    captures.delete(apiKey);
    if (captures.size === 0 && realFetch) {
      globalThis.fetch = realFetch;
      realFetch = null;
    }
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
