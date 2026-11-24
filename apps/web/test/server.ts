import { ANDROID_APP_ORIGIN } from "@streakky/contract";
import { startWorker, type RunningWorker } from "../../api/test/worker.ts";
import type { Connection, DeviceStorage } from "./devices.ts";

export { codeSentTo, emailsSentTo } from "../../api/test/worker.ts";

/** The real API Worker in the Workers runtime, for simulated devices to reach. */
export type Server = RunningWorker;

/** Starts the API Worker with a fresh database, letting `allowlist` sign in. */
export const startServer = ({ allowlist }: { allowlist: string[] }): Promise<Server> =>
  startWorker({ "index.html": "<!doctype html><title>Streakky</title>" }, { allowlist });

let lastAddress = 0;
const addresses = new WeakMap<DeviceStorage, string>();

/** The device's network address, which Cloudflare tells the Worker; kept across restarts. */
function addressOf(storage: DeviceStorage): string {
  if (!addresses.has(storage)) addresses.set(storage, `203.0.113.${++lastAddress}`);
  return addresses.get(storage)!;
}

/**
 * Reaching the server over the network the way the web app does in a browser, which a device's
 * fetch has to do for itself in Node: it keeps the server's cookies in the device's storage and
 * sends them back, and names the app's origin on requests that change something. Cloudflare
 * tells the Worker each device's address, so each device has its own, kept across restarts.
 */
export const online =
  (server: Server): Connection =>
  (storage) => {
    const address = addressOf(storage);
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

/**
 * Reaching the server the way the Android app's WebView does. Its pages come from
 * `https://localhost`, so every request to the server crosses origins: no cookies go with it,
 * and the browser's CORS rules apply. A request that isn't a simple one asks the server first (a
 * preflight); a response the server didn't allow for the app's origin can't be read at all; and
 * of its headers, only the ones the server exposes can be. A refusal fails as fetch does.
 */
export const fromAndroidApp =
  (server: Server): Connection =>
  (storage) => {
    const address = addressOf(storage);
    return async (path, init = {}) => {
      const url = new URL(path, server.url);
      const method = (init.method ?? "GET").toUpperCase();
      const headers = new Headers(init.headers);
      if (!isSimple(method, headers)) {
        const preflight = await fetch(url, {
          method: "OPTIONS",
          headers: {
            Origin: ANDROID_APP_ORIGIN,
            "Access-Control-Request-Method": method,
            "Access-Control-Request-Headers": [...headers.keys()].join(","),
            "CF-Connecting-IP": address,
          },
        });
        if (!preflightAllows(preflight, method, headers)) {
          throw new TypeError(`Failed to fetch: the server didn't allow ${method} ${url.pathname}`);
        }
      }
      headers.set("Origin", ANDROID_APP_ORIGIN);
      headers.set("CF-Connecting-IP", address);
      const response = await fetch(url, { ...init, headers });
      if (response.headers.get("Access-Control-Allow-Origin") !== ANDROID_APP_ORIGIN) {
        throw new TypeError(`Failed to fetch: ${url.pathname} isn't allowed for the app`);
      }
      return readableInAndroidApp(response);
    };
  };

/** Methods and request headers a page may send cross-origin without asking first. */
const SIMPLE_METHODS = ["GET", "HEAD", "POST"];
const SIMPLE_HEADERS = new Set(["accept", "accept-language", "content-language"]);
const SIMPLE_TYPES = ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"];

/** Whether the browser sends a request without asking the server first. */
function isSimple(method: string, headers: Headers): boolean {
  if (!SIMPLE_METHODS.includes(method)) return false;
  return [...headers].every(
    ([name, value]) =>
      SIMPLE_HEADERS.has(name) ||
      (name === "content-type" && SIMPLE_TYPES.some((type) => value.startsWith(type))),
  );
}

/** A comma-separated header's items, lower-cased, such as the methods a preflight allows. */
const listIn = (response: Response, name: string) =>
  (response.headers.get(name) ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

/** Whether the server's answer to a preflight lets the page send its request. */
function preflightAllows(preflight: Response, method: string, headers: Headers): boolean {
  const methods = listIn(preflight, "Access-Control-Allow-Methods");
  const allowedHeaders = listIn(preflight, "Access-Control-Allow-Headers");
  return (
    preflight.ok &&
    preflight.headers.get("Access-Control-Allow-Origin") === ANDROID_APP_ORIGIN &&
    (SIMPLE_METHODS.includes(method) || methods.includes(method.toLowerCase())) &&
    [...headers.keys()].every((name) => SIMPLE_HEADERS.has(name) || allowedHeaders.includes(name))
  );
}

/** Response headers a page may always read cross-origin; the server can expose more. */
const READABLE_HEADERS = [
  "cache-control",
  "content-language",
  "content-length",
  "content-type",
  "expires",
  "last-modified",
  "pragma",
];

/** The response as the page sees it: only the headers it may read. */
function readableInAndroidApp(response: Response): Response {
  const exposed = listIn(response, "Access-Control-Expose-Headers");
  const headers = new Headers();
  for (const [name, value] of response.headers) {
    if (READABLE_HEADERS.includes(name) || exposed.includes(name)) headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
