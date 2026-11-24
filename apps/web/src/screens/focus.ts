const FOCUSABLE = 'button:not(:disabled), [href], input, [tabindex]:not([tabindex="-1"])';

/**
 * Where focus should go if the focused control's list item goes away, say the card of a habit
 * just archived: the same kind of control (by `data-slot`) in the item after it, or the one
 * before. With neither left, as when the last habit's card goes, it's the note the screen in
 * front shows for being empty, if it can take focus. Read before the change, while the item is
 * still there.
 */
export function neighbourOfFocus(): () => Element | null {
  const focused = document.activeElement;
  const item = focused?.closest("li");
  const slot = focused?.getAttribute("data-slot");
  const neighbours = [item?.nextElementSibling, item?.previousElementSibling];
  return () => {
    for (const neighbour of neighbours) {
      if (!neighbour?.isConnected) continue;
      const target =
        (slot ? neighbour.querySelector(`[data-slot="${slot}"]`) : null) ??
        neighbour.querySelector(FOCUSABLE);
      if (target) return target;
    }
    return document.querySelector('section:not([inert]) [data-slot="empty-state"][tabindex]');
  };
}

/**
 * Makes a change, and if it took away the control that had focus, which leaves focus on the
 * page, gives it to `next()` instead.
 */
export async function keepFocus(
  change: () => Promise<void>,
  next: () => Element | null,
): Promise<void> {
  const saved = change();
  // the screens show a change at once, before it's saved: by the next frame they have
  await new Promise((resolve) => requestAnimationFrame(resolve));
  if (document.activeElement === null || document.activeElement === document.body) {
    const target = next();
    if (target instanceof HTMLElement) target.focus({ preventScroll: true });
  }
  await saved;
}
