import { startWorker, type RunningWorker, type SentEmail } from "../../api/test/worker.ts";
import type { Connection, DeviceStorage } from "./devices.ts";

/** The real API Worker in the Workers runtime, for simulated devices to reach. */
export type Server = RunningWorker;

/** Starts the API Worker with a fresh database, letting `allowlist` sign in. */
export const startServer = ({ allowlist }: { allowlist: string[] }): Promise<Server> =>
  startWorker({ "index.html": "<!doctype html><title>Streakky</title>" }, { allowlist });

/** Every email the server has sent to `email`, oldest first. */
export const emailsSentTo = (server: Server, email: string): SentEmail[] =>
  server.sentEmails().filter((sent) => sent.to.includes(email));

/** The code in the latest sign-in email the server sent to `email`. */
export function codeSentTo(server: Server, email: string): string {
  const code = emailsSentTo(server, email)
    .at(-1)
    ?.text.match(/\b\d{6}\b/)?.[0];
  if (!code) throw new Error(`No sign-in code has been emailed to ${email}.`);
  return code;
}

let lastAddress = 0;
const addresses = new WeakMap<DeviceStorage, string>();

/**
 * Reaching the server over the network the way the web app does in a browser, which a device's
 * fetch has to do for itself in Node: it keeps the server's cookies in the device's storage and
 * sends them back, and names the app's origin on requests that change something. Cloudflare
 * tells the Worker each device's address, so each device has its own, kept across restarts.
 */
export const online =
  (server: Server): Connection =>
  (storage) => {
    if (!addresses.has(storage)) addresses.set(storage, `203.0.113.${++lastAddress}`);
    const address = addresses.get(storage)!;
    return async (path, init = {}) => {
      const url = new URL(path, server.url);
      const headers = new Headers(init.headers);
      const method = (init.method ?? "GET").toUpperCase();
      if (method !== "GET" && method !== "HEAD") headers.set("Origin", url.origin);
      const cookies = [...storage.cookies].map(([name, value]) => `${name}=${value}`);
      if (cookies.length > 0) headers.set("Cookie", cookies.join("; "));
      headers.set("CF-Connecting-IP", address);
      const response = await fetch(url, { ...init, headers });
      for (const header of response.headers.getSetCookie()) keepCookie(storage.cookies, header);
      return response;
    };
  };

/** Stores a `Set-Cookie` the way a browser does, removing the cookie when it has expired. */
function keepCookie(cookies: Map<string, string>, header: string) {
  const [pair, ...attributes] = header.split(";");
  const separator = pair.indexOf("=");
  const name = pair.slice(0, separator).trim();
  const value = pair.slice(separator + 1).trim();
  const expired = attributes.some((attribute) => {
    const [key, setting = ""] = attribute.trim().split("=");
    if (key.toLowerCase() === "max-age") return Number(setting) <= 0;
    if (key.toLowerCase() === "expires") return Date.parse(setting) <= Date.now();
    return false;
  });
  if (expired || value === "") cookies.delete(name);
  else cookies.set(name, value);
}
