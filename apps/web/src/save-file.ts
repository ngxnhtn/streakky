import type { ExportFile } from "./store/export.ts";

/**
 * Hands a file to the person, the one place each platform chooses how. The web downloads it. The
 * Android app (ticket 16) opens the share sheet here instead, so the person can save the file to
 * Files or send it somewhere; the screens only call this.
 */
export async function saveFile({ name, type, text }: ExportFile): Promise<void> {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = Object.assign(document.createElement("a"), { href: url, download: name });
  // Firefox and Safari read the blob after click() returns: attach the link, and revoke later
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
