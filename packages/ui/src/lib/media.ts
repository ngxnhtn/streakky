/** Whether a media query matches now; false outside a browser, as in the web app's tests. */
export const matchesMedia = (query: string): boolean =>
  typeof window !== "undefined" && window.matchMedia(query).matches;
