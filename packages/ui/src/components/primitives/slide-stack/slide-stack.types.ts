import type { ReactNode } from 'react';
import type { MotionValue } from 'framer-motion';

export type SlideStackDirection = 1 | -1;

/**
 * Gate for an interactive drag direction. A plain boolean for static cases;
 * a function for live checks (evaluated the moment the gesture would engage,
 * e.g. "is the current form step valid right now"). The function may be
 * async: the drag stays visually inert while the promise resolves, engages
 * from the live finger position on `true`, and never engages on `false` —
 * no ghost, no pane movement. Omitted counts as allowed.
 */
export type SlideStackCondition =
  | boolean
  | (() => boolean | Promise<boolean>);

export type SlideStackProps = {
  /** Id of the pane to show. Must match the `id` of one of the pane children. */
  activeId: string;
  /**
   * Controlled navigation direction. When omitted, the stack infers it from
   * the order of the pane children: navigating to a later pane is forward
   * (new pane slides in on top), to an earlier pane is backward (top pane
   * slides off to the right).
   */
  direction?: SlideStackDirection;
  /**
   * Animate the first pane in on mount. Defaults to false — a stack at rest
   * renders its active pane without an entrance.
   */
  animateInitial?: boolean;
  /**
   * Navigate one pane back. Enables the interactive rightward drag (the pane
   * follows the finger; release commits or springs back). When the stack sits
   * inside a SlidePageSurface, a close request while beyond the first pane
   * (header back arrow) also calls this instead of closing the surface, and
   * the surface's own swipe dismiss is muted; at the first pane the surface
   * closes as usual.
   */
  onBack?: () => void;
  /**
   * Navigate one pane forward. Enables the interactive leftward drag: the
   * next pane follows the finger in on top of the current one; release
   * commits (calls this) or springs back. Only engages when a later pane
   * exists. Omit (or pass undefined while advancing is not allowed) to
   * disable the forward drag.
   */
  onForward?: () => void;
  /**
   * Condition for the backward drag. Only the gesture is gated — a surface
   * close interception (header back arrow) still routes to `onBack`; guard
   * inside `onBack` itself to block that path too.
   */
  canBack?: SlideStackCondition;
  /** Condition for the forward drag (e.g. current step validated). */
  canForward?: SlideStackCondition;
  /**
   * Set when honoring `onBack`/`onForward` changes `activeId` **asynchronously**
   * — the react-router data router is the case that matters: `navigate()`
   * resolves a tick later, so the pane swap cannot land in the same render
   * batch as the committed drag.
   *
   * The stand-in ghost is then kept until `activeId` actually changes, instead
   * of being removed with the navigation request. Without it the outgoing pane
   * is exposed for a frame between the two commits and flashes as a snapshot of
   * the page just left. Leave off for synchronous consumers (a plain
   * `setState`): they would hold the ghost — and with it the next pane's
   * content — visible for the fallback window whenever they *decline* to
   * navigate.
   */
  awaitNavigation?: boolean;
  /**
   * Fired the instant a drag commits (finger released past the threshold) —
   * one settle animation *before* `onBack`/`onForward` run. The pane swap
   * cannot move earlier (the ghost is still travelling), but chrome around
   * the stack can: use this to advance a progress indicator, stepper, or
   * title in the same frame the user let go, instead of ~240 ms later.
   * Never fired for a drag that springs back, and a commit can still be
   * declined by the consumer inside `onForward` — treat it as optimistic.
   */
  onCommit?: (type: SlideStackDragType) => void;
  /**
   * Scroll offset (px, within the panes' shared scroll parent) a pane was
   * last left at, for consumers that restore per-pane scroll positions when
   * navigating. During an interactive drag the ghost pre-scrolls its content
   * to this offset, so the preview shows exactly what the target pane will
   * show once the navigation lands and the consumer restores its scroll —
   * without it, the ghost previews the pane's top and the handoff jumps.
   * Omit (or return 0) when panes always land at their top.
   */
  paneScrollMemory?: (paneId: string) => number;
  /**
   * Content the page scrolls above the panes (searchbar, filter pills).
   * Rendered by the stack in flow before the panes — visually identical to
   * rendering it as a sibling — so a drag whose landing scroll reveals it can
   * include a copy in the ghost: the preview then shows the landed viewport
   * (header + pane) instead of the pane alone, and the header no longer pops
   * in after the swap. Must render pure from props/state (the ghost copy has
   * no live focus or internal-only state), and everything that scrolls above
   * the panes must live here — content outside stays un-previewable.
   */
  header?: ReactNode;
  children: ReactNode;
};

export type SlideStackPaneProps = {
  id: string;
  children: ReactNode;
  className?: string;
  'data-testid'?: string;
  /** Forwarded by AnimatePresence (popLayout) to measure the exiting pane. */
  ref?: React.Ref<HTMLDivElement>;
};

export type SlideStackDragType = 'back' | 'forward';

/**
 * Stack-side controller for an interactive pane drag. The active pane's
 * gesture hook drives it: check() resolves whether the direction may engage
 * (structural availability + the direction's condition — possibly async,
 * side-effect free), engage() mounts the ghost copy of the target pane,
 * update() feeds live finger progress (0..1 of pane width), end() animates
 * the ghost to its final pose and, when committed, performs the navigation.
 */
export type SlideStackDragController = {
  check: (type: SlideStackDragType) => boolean | Promise<boolean>;
  /** viewportTop: the scroll viewport's visible top expressed in the
   * positioned parent's coordinate space (negative when the panes' flow
   * position is below it — i.e. the header above them is on screen).
   * paneOffsetTop: the dragged pane's flow offset — the baseline pane-local
   * content offsets are derived against.
   * clipHeight: the scroll viewport's height. When present, the ghost renders
   * as a clipped window of exactly this height instead of a full-height sheet
   * — full-height ghosts forced the compositor to rasterize the entire list
   * (thousands of px of cards) at drag start, the measured source of drag
   * jank on scrolled, content-heavy pages. */
  engage: (
    type: SlideStackDragType,
    geometry?: {
      viewportTop: number;
      paneOffsetTop: number;
      clipHeight?: number;
    },
  ) => boolean;
  update: (progress: number) => void;
  end: (committed: boolean) => void;
  /** Fast-forwards a drag that is in its post-release settle animation:
   * jumps the ghost to its end pose and finalizes (navigation included)
   * immediately. Called on every new touch so consecutive swipes never wait
   * out the settle. No-op unless a settle is in flight. */
  settleNow: () => void;
};

/**
 * Present only on the ghost copy of a pane rendered while a drag is in
 * progress: 'under' is the previous pane revealed beneath a back drag,
 * 'over' is the next pane tracking the finger in during a forward drag.
 */
export type SlideStackGhostPose = {
  type: 'under' | 'over';
  progress: MotionValue<number>;
  /** Top offset (px) the ghost is pinned at inside the positioned parent. */
  anchorTop: number;
  /** Scroll offset the ghost pre-scrolls its content to, in the coordinate
   * space of that content: pane-local for a pane-only ghost, composite-local
   * (header top = 0) when `header` is present. 0 = show from the top. */
  contentOffsetY: number;
  /** Explicit ghost height (the scroll viewport). Undefined = legacy
   * full-height sheet (no scrollable ancestor found to measure). */
  clipHeight?: number;
  /** Copy of the stack's `header` prop. When present the ghost previews the
   * full landed viewport (header + pane composite) — whatever the landing
   * scroll shows of the header appears in the preview, so it can never pop in
   * or out at the swap. */
  header?: ReactNode;
};

export type SlideStackContextValue = {
  direction: SlideStackDirection;
  /** Currently active pane id — exiting panes see the new value, letting a
   * pane distinguish "consumer declined to navigate" from "I'm on my way
   * out" after a committed drag. */
  activeId: string;
  /** True right after a committed drag: the pane the ghost stood in for
   * mounts settled at rest instead of replaying the enter animation. */
  suppressEnter: boolean;
  drag: SlideStackDragController;
  /** The stack's `paneScrollMemory` prop, passed through so exiting panes can
   * derive the swap's scroll delta without measuring the DOM. */
  paneScrollMemory?: (paneId: string) => number;
  /**
   * The stack's own per-pane scroll memory for consumers that share one
   * scroll container without managing it (`paneScrollMemory` absent). The
   * active pane records its scroller position while live; on re-activation it
   * restores the remembered position (clamped to its extent). Consumers with
   * their own memory override this entirely.
   */
  internalScrollMemory: {
    get: (paneId: string) => number | undefined;
    set: (paneId: string, value: number) => void;
  };
  ghost?: SlideStackGhostPose;
};
