import { insideNativeApp } from "./platform.ts";
import type { ExportFile } from "./store/export.ts";

/**
 * Hands a file to the person, the one place each platform chooses how; the screens only call
 * this. The web downloads it. The Android app opens the share sheet, so the person can save the
 * file to Files or send it somewhere.
 */
export async function saveFile(file: ExportFile): Promise<void> {
  if (insideNativeApp()) {
    const { shareFile } = await import("./android.ts");
    return shareFile(file);
  }
  const { name, type, text } = file;
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = Object.assign(document.createElement("a"), { href: url, download: name });
  // Firefox and Safari read the blob after click() returns: attach the link, and revoke later
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
