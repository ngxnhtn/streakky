import * as React from "react";
import { prefersReducedMotion } from "@streakky/ui/hooks/use-tween";

/** How long a finger rests on an item before it lifts. Any shorter and it would fight scrolling. */
const HOLD_MS = 400;
/** How far a finger may wander while it rests, in rem; further, and it's scrolling. */
const HOLD_SLOP = 0.625;
/** How far a mouse moves with its button down before the item lifts, in rem. */
const MOUSE_SLOP = 0.375;
/** How long a dropped item takes to settle into its place, as the items' transitions do. */
const SETTLE_MS = 200;
/** How near the scroller's top or bottom edge a dragged item scrolls it, in rem. */
const EDGE = 4;
/** How fast it scrolls with the pointer at the very edge, in rem a second. */
const EDGE_SPEED = 45;

/**
 * Where an item stands in a drag:
 * - `lifted`: it follows the pointer;
 * - `settling`: dropped, it glides into its new place;
 * - `shifting`: another item, making room;
 * - `moved`: the drop is made and the new order is on its way, so nothing animates.
 */
export type ReorderState = "lifted" | "settling" | "shifting" | "moved";

type Drag = {
  /** the items' keys when it lifted: if they change meanwhile, the drag is over */
  keys: string;
  from: number;
  to: number;
  phase: "lifted" | "settling" | "moved";
  /** each item's box when it lifted, as the page was scrolled then */
  slots: DOMRect[];
};

type Lifted = {
  el: HTMLElement;
  scroller: HTMLElement;
  scrollTop0: number;
  slots: DOMRect[];
  to: number;
  frame: number;
  lastFrame: number;
};

/** A press on an item, from the pointer going down until it comes up. */
type Gesture = {
  pointerId: number;
  index: number;
  keys: string;
  touch: boolean;
  x0: number;
  y0: number;
  x: number;
  y: number;
  hold?: number;
  lifted?: Lifted;
};

type Drop = "here" | "home" | "abandon";

/**
 * Lets the person drag a list's items into a new order, for items laid out in equal slots, as a
 * grid of cards or a list of rows is.
 * - A mouse lifts an item once it moves a little with its button down, so a click stays a click.
 * - A finger or pen lifts it after resting on it for a moment, so a swipe still scrolls.
 * - The lifted item follows the pointer within the items' span, the others make room, and the
 *   scroller scrolls near its edges. Escape puts it back. Dropped, it settles into place, then
 *   `onMove(from, to)` asks for the new order, `to` being its index in that order.
 * - The click that ends a drag is swallowed, so a drop never opens or toggles what's under it.
 * - Alt with the up or down arrow moves the item holding the focus one place earlier or later.
 *
 * `keys` are the items' identities in their order; when they change mid-drag, the drag ends.
 * Under reduced motion nothing glides: the items swap places at once.
 */
export function useReorder({
  keys,
  onMove,
  enabled = true,
}: {
  keys: string[];
  onMove: (from: number, to: number) => void;
  enabled?: boolean;
}) {
  const [list, listRef] = React.useState<HTMLUListElement | null>(null);
  const [drag, setDrag] = React.useState<Drag | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const keyString = keys.join("\n");
  const latest = React.useRef({ keyString, count: keys.length, onMove, busy: false });
  latest.current = { keyString, count: keys.length, onMove, busy: drag !== null };
  const gesture = React.useRef<Gesture | null>(null);
  const ender = React.useRef<((drop: Drop) => void) | null>(null);
  /** after a keyboard move: what had the focus, and the order the move asked for */
  const refocus = React.useRef<{ el: HTMLElement; keys: string } | null>(null);

  const announce = (to: number) =>
    setAnnouncement(`Moved to position ${to + 1} of ${latest.current.count}.`);

  React.useEffect(() => {
    if (!list || !enabled) return;

    /** Puts the lifted item under the pointer and finds the slot it's over. */
    const follow = () => {
      const g = gesture.current;
      const l = g?.lifted;
      if (!g || !l) return;
      const home = l.slots[g.index];
      const scrolled = l.scroller.scrollTop - l.scrollTop0;
      const lefts = l.slots.map((s) => s.left);
      const tops = l.slots.map((s) => s.top);
      const left = clamp(home.left + g.x - g.x0, Math.min(...lefts), Math.max(...lefts));
      const top = clamp(home.top + g.y - g.y0 + scrolled, Math.min(...tops), Math.max(...tops));
      l.el.style.setProperty("--reorder-x", `${left - home.left}px`);
      l.el.style.setProperty("--reorder-y", `${top - home.top}px`);
      const to = nearest(l.slots, left + home.width / 2, top + home.height / 2);
      if (to !== l.to) {
        l.to = to;
        setDrag((d) => d && { ...d, to });
      }
    };

    /** Scrolls while the pointer is near the scroller's top or bottom edge. */
    const autoScroll = (now: number) => {
      const g = gesture.current;
      const l = g?.lifted;
      if (!g || !l) return;
      const seconds = Math.min((now - l.lastFrame) / 1000, 0.05);
      l.lastFrame = now;
      const rem = remPx();
      const box =
        l.scroller === document.scrollingElement
          ? { top: 0, bottom: window.innerHeight }
          : l.scroller.getBoundingClientRect();
      const edge = EDGE * rem;
      const pull =
        g.y < box.top + edge
          ? -Math.min(1, (box.top + edge - g.y) / edge)
          : g.y > box.bottom - edge
            ? Math.min(1, (g.y - (box.bottom - edge)) / edge)
            : 0;
      if (pull !== 0) l.scroller.scrollTop += pull * EDGE_SPEED * rem * seconds;
      l.frame = requestAnimationFrame(autoScroll);
    };

    const lift = (g: Gesture) => {
      g.hold = undefined;
      const items = Array.from(list.children).slice(0, latest.current.count) as HTMLElement[];
      const el = items[g.index];
      if (!el || latest.current.keyString !== g.keys) return end("abandon");
      const scroller = scrollerOf(list);
      const slots = items.map((item) => item.getBoundingClientRect());
      const lastFrame = performance.now();
      g.lifted = {
        el,
        scroller,
        scrollTop0: scroller.scrollTop,
        slots,
        to: g.index,
        frame: 0,
        lastFrame,
      };
      g.lifted.frame = requestAnimationFrame(autoScroll);
      el.style.setProperty("--reorder-x", "0px");
      el.style.setProperty("--reorder-y", "0px");
      scroller.addEventListener("scroll", follow, { passive: true });
      setDrag({ keys: g.keys, from: g.index, to: g.index, phase: "lifted", slots });
      follow();
    };

    /** Ends the press. A lifted item settles where it is (`here`) or where it was (`home`). */
    const end = (drop: Drop) => {
      const g = gesture.current;
      if (!g) return;
      gesture.current = null;
      window.clearTimeout(g.hold);
      const l = g.lifted;
      if (!l) return;
      cancelAnimationFrame(l.frame);
      l.scroller.removeEventListener("scroll", follow);
      swallowNextClick();
      if (drop === "abandon") {
        clearOffset(l.el);
        setDrag(null);
        return;
      }
      const to = drop === "here" ? l.to : g.index;
      setDrag((d) => d && { ...d, to, phase: "settling" });
      window.setTimeout(
        () => {
          clearOffset(l.el);
          if (to === g.index || latest.current.keyString !== g.keys) {
            setDrag(null);
            return;
          }
          setDrag((d) => d && { ...d, phase: "moved" });
          latest.current.onMove(g.index, to);
          announce(to);
          // if the new order never comes, say because the move was refused, show the old one
          window.setTimeout(() => setDrag((d) => (d?.phase === "moved" ? null : d)), 1000);
        },
        prefersReducedMotion() ? 0 : SETTLE_MS,
      );
    };

    const onPointerDown = (e: PointerEvent) => {
      if (gesture.current || latest.current.busy || !e.isPrimary || e.button !== 0) return;
      const index = indexOf(list, e.target, latest.current.count);
      if (index === -1) return;
      const g: Gesture = {
        pointerId: e.pointerId,
        index,
        keys: latest.current.keyString,
        touch: e.pointerType !== "mouse",
        x0: e.clientX,
        y0: e.clientY,
        x: e.clientX,
        y: e.clientY,
      };
      gesture.current = g;
      if (g.touch) g.hold = window.setTimeout(() => lift(g), HOLD_MS);
    };
    const onPointerMove = (e: PointerEvent) => {
      const g = gesture.current;
      if (!g || e.pointerId !== g.pointerId) return;
      [g.x, g.y] = [e.clientX, e.clientY];
      if (g.lifted) return follow();
      const moved = Math.hypot(g.x - g.x0, g.y - g.y0) / remPx();
      if (g.touch && moved > HOLD_SLOP) end("abandon");
      else if (!g.touch && moved > MOUSE_SLOP) lift(g);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId === gesture.current?.pointerId) end("here");
    };
    // the browser took the pointer, say to scroll before the item lifted
    const onPointerCancel = (e: PointerEvent) => {
      if (e.pointerId === gesture.current?.pointerId) end("home");
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && gesture.current?.lifted) {
        e.preventDefault();
        end("home");
      }
    };
    // Once an item is lifted, a moving finger drags it instead of scrolling the page. For that,
    // this listener has to be in place before the touch starts, and not passive.
    const onTouchMove = (e: TouchEvent) => {
      if (gesture.current?.lifted && e.cancelable) e.preventDefault();
    };
    // a resting finger mustn't open the browser's menu
    const onContextMenu = (e: MouseEvent) => {
      if (gesture.current?.touch) e.preventDefault();
    };

    list.addEventListener("pointerdown", onPointerDown);
    list.addEventListener("touchmove", onTouchMove, { passive: false });
    list.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("keydown", onKeyDown);
    ender.current = end;
    return () => {
      end("abandon");
      ender.current = null;
      list.removeEventListener("pointerdown", onPointerDown);
      list.removeEventListener("touchmove", onTouchMove);
      list.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [list, enabled]);

  // The items changed: after a drop, that's the new order arriving; under a lifted item, say
  // from another tab, the drag is over. Either way the old slots no longer apply.
  const current = drag?.keys === keyString ? drag : null;
  React.useEffect(() => {
    if (!drag || drag.keys === keyString) return;
    ender.current?.("abandon");
    setDrag(null);
  }, [drag, keyString]);

  // A keyboard move: React moves some items' elements, which takes the focus off them. Only
  // the order that move asked for gives it back; any other change, such as a habit leaving,
  // is left to whoever made it.
  React.useLayoutEffect(() => {
    const move = refocus.current;
    refocus.current = null;
    if (move?.keys !== keyString) return;
    if (move.el.isConnected && document.activeElement !== move.el) move.el.focus();
  }, [keyString]);

  /** What each item's element takes: its place in a drag, and the keyboard moves. */
  const item = (index: number) => {
    if (!enabled) return {};
    let state: ReorderState | undefined;
    let translate: string | undefined;
    if (current) {
      const { from, to, phase, slots } = current;
      if (index === from) {
        state = phase;
        translate =
          phase === "lifted" ? "var(--reorder-x) var(--reorder-y)" : offset(slots, from, to);
      } else {
        const at = shifted(index, from, to);
        state = phase === "moved" ? "moved" : "shifting";
        translate = at === index ? undefined : offset(slots, index, at);
      }
    }
    return {
      "data-reorder": state,
      style: translate ? { translate } : undefined,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || drag) return;
        const to = e.key === "ArrowUp" ? index - 1 : e.key === "ArrowDown" ? index + 1 : null;
        if (to === null) return;
        e.preventDefault();
        if (to < 0 || to >= keys.length) return;
        const el = document.activeElement;
        const moved = [...keys];
        moved.splice(to, 0, ...moved.splice(index, 1));
        refocus.current = el instanceof HTMLElement ? { el, keys: moved.join("\n") } : null;
        onMove(index, to);
        announce(to);
      },
    };
  };

  return { listRef, item, announcement };
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const remPx = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

function scrollerOf(el: HTMLElement): HTMLElement {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p);
    if (overflowY === "auto" || overflowY === "scroll") return p;
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}

/** Which of the list's first `count` items holds `target`, or -1. */
function indexOf(list: HTMLElement, target: EventTarget | null, count: number) {
  let el = target instanceof Element ? target : null;
  while (el && el.parentElement !== list) el = el.parentElement;
  const index = el ? Array.prototype.indexOf.call(list.children, el) : -1;
  return index < count ? index : -1;
}

const nearest = (slots: DOMRect[], x: number, y: number) => {
  let best = 0;
  let bestDistance = Infinity;
  slots.forEach((s, i) => {
    const distance = (s.left + s.width / 2 - x) ** 2 + (s.top + s.height / 2 - y) ** 2;
    if (distance < bestDistance) [best, bestDistance] = [i, distance];
  });
  return best;
};

/** Where item `i` stands once the item at `from` has moved to `to`. */
const shifted = (i: number, from: number, to: number) =>
  from < to && i > from && i <= to ? i - 1 : to < from && i >= to && i < from ? i + 1 : i;

const offset = (slots: DOMRect[], i: number, j: number) =>
  `${slots[j].left - slots[i].left}px ${slots[j].top - slots[i].top}px`;

function clearOffset(el: HTMLElement) {
  el.style.removeProperty("--reorder-x");
  el.style.removeProperty("--reorder-y");
}

/**
 * After a drag the browser may still send a click to what's under the pointer, which mustn't
 * open a habit or check one in. The next press, or a moment's wait, stops the swallowing.
 */
function swallowNextClick() {
  const swallow = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    stop();
  };
  const stop = () => {
    window.removeEventListener("click", swallow, true);
    window.removeEventListener("pointerdown", stop, true);
    window.clearTimeout(timer);
  };
  window.addEventListener("click", swallow, true);
  window.addEventListener("pointerdown", stop, true);
  const timer = window.setTimeout(stop, 500);
}
