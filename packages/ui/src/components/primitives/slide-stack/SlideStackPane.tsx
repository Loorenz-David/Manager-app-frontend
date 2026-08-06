import { useCallback, useLayoutEffect, useRef } from 'react';
import { m, useIsPresent, useMotionValue, useTransform } from 'framer-motion';

import { cn } from '@beyo/lib';

import { findNearestScroller } from './find-nearest-scroller';
import { fmtBox, perfLog, watchHeader } from './slide-stack-perf';
import { useSlideStackContext } from './SlideStackContext';
import { useSlideStackDrag } from './use-slide-stack-drag';
import {
  slideStackPaneTransition,
  slideStackPaneVariants,
  slideStackPose,
} from './slide-stack.variants';
import type { SlideStackGhostPose, SlideStackPaneProps } from './slide-stack.types';

const PANE_BASE_CLASSES =
  // relative: zIndex is ignored on statically positioned elements.
  // bg-background: the top pane must be opaque to cover the pane beneath.
  'relative w-full bg-background';

export function SlideStackPane(props: SlideStackPaneProps): React.JSX.Element {
  const { ghost } = useSlideStackContext();
  return ghost ? <GhostPane {...props} ghost={ghost} /> : <ActivePane {...props} />;
}

function ActivePane({
  id,
  children,
  className,
  'data-testid': testId,
  ref,
}: SlideStackPaneProps): React.JSX.Element {
  const {
    direction,
    activeId,
    suppressEnter,
    drag,
    paneScrollMemory,
    internalScrollMemory,
  } = useSlideStackContext();
  const isActiveRef = useRef(true);
  isActiveRef.current = activeId === id;
  // An exiting pane can sit above the new active pane (back navigation exits
  // on top) — it must never swallow the touches meant for the live pane.
  // useIsPresent (not usePresence): the read-only variant, so AnimatePresence
  // still removes the pane on its own once the exit animation finishes.
  const isPresent = useIsPresent();

  // The pane's position/opacity as adopted MotionValues: the enter/center/exit
  // variants animate these same values, and the interactive drag writes them
  // directly — one source of truth, mirroring the surface's panelX strategy.
  const x = useMotionValue<string | number>(0);
  const y = useMotionValue(0);
  const opacity = useMotionValue(1);

  // Local handle on the pane element for the drag listeners, merged with the
  // ref AnimatePresence (popLayout) forwards to measure the exiting pane.
  const paneRef = useRef<HTMLDivElement | null>(null);
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      paneRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref],
  );

  useSlideStackDrag({
    targetRef: paneRef,
    x,
    opacity,
    controller: drag,
    isActive: () => isActiveRef.current,
  });

  // ── Landing scroll: restore + pre-clamp + record ─────────────────────────
  // On consumers sharing one scroll container, the scroller's position
  // belongs to whichever pane is showing. When this pane becomes active it
  // lands the scroller in the same commit, before paint:
  //  - at its remembered position (recorded below while it was last active;
  //    first visit inherits the current depth), and
  //  - clamped to this pane's extent — sliding from a long pane scrolled deep
  //    to a shorter one would otherwise leave scrollTop beyond the content,
  //    and the browser only clamps once the exiting pane unmounts, a frame
  //    late: the new pane painted above the viewport (exposing the old pane
  //    behind it), then everything lurched when the clamp landed.
  // While active, a passive scroll listener records the position, so the next
  // return (and the drag ghost's preview, which reads the same memory) lands
  // where the user left it. Per-pane-scroller consumers find no shared
  // scroller and skip everything.
  //
  // A consumer with its own scroll memory (`paneScrollMemory` — StagedForm)
  // owns the shared scroller outright and this stands down completely. The two
  // systems cannot share it: child effects run before parent ones, so this
  // effect's restore lands *before* the consumer saves the outgoing pane's
  // position — the consumer then reads the value this just wrote (0 on a
  // first visit) and stores it as that pane's memory, destroying it. The
  // symptom is a drag ghost previewing the wrong scroll depth: `engage` reads
  // the consumer's clobbered memory while the landing uses the (correct) one
  // recorded here, and the swap jumps between them.
  const isActive = activeId === id;
  useLayoutEffect(() => {
    if (!isActive || paneScrollMemory) return;
    const node = paneRef.current;
    if (!node) return;
    const scroller = findNearestScroller(node);
    if (!scroller) return;
    // The pane's bottom expressed in the scroller's content coordinates (its
    // offsetTop is relative to the positioned wrapper, not the scroller, so
    // rect math bridges the two spaces).
    const paneRect = node.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    const paneTopInScroller =
      paneRect.top - scrollerRect.top - scroller.clientTop + scroller.scrollTop;
    const maxScroll = Math.max(
      0,
      paneTopInScroller + paneRect.height - scroller.clientHeight,
    );
    const remembered = internalScrollMemory.get(id) ?? scroller.scrollTop;
    const landed = Math.min(remembered, maxScroll);
    if (scroller.scrollTop !== landed) {
      scroller.scrollTop = landed;
    }
    internalScrollMemory.set(id, landed);

    const recordScroll = () => {
      internalScrollMemory.set(id, scroller.scrollTop);
    };
    scroller.addEventListener('scroll', recordScroll, { passive: true });
    return () => {
      scroller.removeEventListener('scroll', recordScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // ── TEMP instrumentation: the real pane's height chain ───────────────────
  // Three phases, because the interesting state sits between the usual two:
  //  - 'layout'  : this child effect, BEFORE a consumer's own layout effect
  //                has restored the scroll (parent effects run after
  //                children's), so it shows the pre-restore position;
  //  - 'settled' : a microtask, after every layout effect but still before
  //                paint — this is what the user actually first sees;
  //  - 'frame'   : the next animation frame, which catches anything that
  //                moves after the paint (a footer dropping into place).
  // `foot` is the pane's bottom-most block — the footer, for a staged step.
  useLayoutEffect(() => {
    if (!isActive) return;
    const node = paneRef.current;
    if (!node) return;
    const scroller = findNearestScroller(node);
    const snapshot = (phase: string) => {
      if (!node.isConnected) return;
      // A stand-in still in the DOM at this point is overlapping the real
      // pane. It is positioned in the scroll container's CONTENT coordinates,
      // so a swap that moves the scroll carries it along: `stand` reports
      // where it actually sits now. Anything intersecting 0..vh is on screen
      // and being painted over the real content.
      perfLog(
        `pane ${id} ${phase} scroll=${
          scroller ? Math.round(scroller.scrollTop) : 'n/a'
        } vh=${scroller ? scroller.clientHeight : 'n/a'} ${fmtBox(
          'pane',
          node,
        )} ${fmtBox('foot', node.lastElementChild)} ${fmtBox(
          'stand',
          document.querySelector('[data-slide-ghost]'),
        )}`,
      );
    };
    snapshot('layout');
    queueMicrotask(() => snapshot('settled'));
    let frames = 0;
    let frame = 0;
    const sampleFrame = () => {
      frames += 1;
      snapshot(`frame${frames}`);
      if (frames < 2) frame = requestAnimationFrame(sampleFrame);
    };
    frame = requestAnimationFrame(sampleFrame);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // ── Exit scroll compensation ─────────────────────────────────────────────
  // A consumer with per-pane scroll memory (StagedForm) moves the shared
  // scroll container in the same commit that swaps the panes: it saves this
  // exiting pane's position and restores the incoming pane's. But popLayout
  // pins this exiting pane at its *flow* offset — content coordinates — so
  // that scroll move would visually snap it away from the region the user was
  // reading for the length of its exit animation. Compensate by the same
  // delta, derived from the memory itself rather than measured from the DOM
  // (no forced layout on the swap frame): scroll goes from this pane's
  // just-saved position to the incoming pane's remembered one. The microtask
  // defers the reads past the consumer's layout effect (child effects run
  // first — the save hasn't happened yet when this runs), still before paint.
  // Consumers without scroll memory skip all of this — their shared scroll
  // never moves on a swap.
  // Moving up is the dangerous direction: the pane rises out of its own flow
  // box into whatever the consumer renders above the panes — a header — and
  // popLayout has already made it absolutely positioned with a z-index, so it
  // paints OVER that static chrome instead of under it. Exiting at 0.7 opacity
  // it reads as a translucent copy of the outgoing pane smeared across the new
  // pane's header, for exactly as long as the exit animation lasts. Clipping
  // the lifted part restores the pane's original top edge: the compensation
  // still holds the content still, but the pane can never draw above where it
  // actually started. Only the rows scrolled past are hidden — the content
  // that was on screen is untouched.
  useLayoutEffect(() => {
    if (isPresent || !paneScrollMemory) return;
    queueMicrotask(() => {
      const node = paneRef.current;
      if (!node?.isConnected) return;
      const delta = paneScrollMemory(activeId) - paneScrollMemory(id);
      if (delta !== 0) {
        y.set(delta);
      }
      node.style.clipPath = delta < 0 ? `inset(${-delta}px 0 0 0)` : '';
    });
    // The flip to isPresent=false happens in the swap render, so activeId and
    // the memory callback captured here are that render's — exactly the swap
    // this compensates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent, y]);

  return (
    <m.div
      key={id}
      ref={setRefs}
      animate="center"
      className={cn(PANE_BASE_CLASSES, className)}
      custom={direction}
      data-slide-pane={id}
      data-testid={testId ?? `slide-stack-pane-${id}`}
      exit="exit"
      // After a committed drag the ghost already stands exactly where this
      // pane belongs: mount settled instead of replaying the enter.
      initial={suppressEnter ? false : 'enter'}
      style={{ x, y, opacity, pointerEvents: isPresent ? undefined : 'none' }}
      transition={slideStackPaneTransition}
      variants={slideStackPaneVariants}
    >
      {children}
    </m.div>
  );
}

/**
 * The stand-in copy of the drag's target pane, mounted only while a drag is
 * in progress. Pose is a pure derivation of the live drag progress:
 * - 'under' (back drag): the previous pane beneath, un-receding from its
 *   resting recede toward rest as the top pane is pulled away.
 * - 'over' (forward drag): the next pane tracking the finger in from the
 *   right edge, on top of the panes only.
 * Pinned at the dragged pane's own flow offset (ghost.anchorTop), so content
 * the consumer renders above the panes — headers, timelines — stays above
 * the transition instead of being covered by a full-page slide.
 */
function GhostPane({
  id,
  children,
  className,
  'data-testid': testId,
  ghost,
}: SlideStackPaneProps & { ghost: SlideStackGhostPose }): React.JSX.Element {
  const mountMeasureRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  // With a header the ghost is a composite of the landed viewport: the pane's
  // own classes move to an inner pane box so its layout (min-heights
  // included) reproduces the real pane and the clamp measurement is exact.
  const isComposite = ghost.header !== undefined;
  useLayoutEffect(() => {
    // The preview offset can exceed what the target can actually scroll to,
    // which would preview blank space below its content: an inherited offset
    // (first visit, carried from the current depth) may simply be too deep for
    // a shorter pane, and even a remembered one can outlive the extent it was
    // achieved at (a form field collapsing, the keyboard inset going away).
    // Clamp to "scrolled to the end", mirroring the clamp the landing applies
    // — the composite reproduces the real layout, so this measurement and the
    // landing's agree.
    const content = contentRef.current;
    let appliedOffset = ghost.contentOffsetY;
    if (content && ghost.clipHeight !== undefined && ghost.contentOffsetY > 0) {
      const clamped = Math.min(
        ghost.contentOffsetY,
        Math.max(0, content.scrollHeight - ghost.clipHeight),
      );
      if (clamped !== ghost.contentOffsetY) {
        content.style.transform = `translateY(-${clamped}px)`;
        appliedOffset = clamped;
      }
    }
    // The pane box inside a composite is the wrapper's last child (the header
    // copy renders before it); a pane-only ghost puts the pane content
    // directly in the window. `lastChild` is then that box's bottom-most
    // block — the same element `pane-metrics` reports for the real pane, so
    // the two sets of numbers are directly comparable.
    const paneBox = isComposite
      ? (content?.lastElementChild ?? null)
      : (mountMeasureRef.current ?? null);
    const snapshot = (phase: string) => {
      perfLog(
        `ghost ${id} ${phase} composite=${isComposite} clip=${
          ghost.clipHeight ?? 'none'
        } off=${Math.round(appliedOffset)} ${fmtBox(
          'win',
          mountMeasureRef.current,
        )} ${fmtBox('wrap', content)} ${fmtBox('pane', paneBox)} ${fmtBox(
          'foot',
          paneBox?.lastElementChild,
        )}`,
      );
    };
    snapshot('mount');
    // A ghost mounting means a drag just engaged: watch the header from here
    // through the settle, the swap and the outgoing pane's exit.
    const scrollerForWatch = mountMeasureRef.current
      ? findNearestScroller(mountMeasureRef.current)
      : null;
    if (scrollerForWatch) watchHeader(scrollerForWatch);
    const frame = requestAnimationFrame(() => snapshot('frame'));
    return () => {
      cancelAnimationFrame(frame);
      // Marks the handoff: everything logged after this is the real pane
      // standing on its own. The box is where the stand-in ended up — it is
      // anchored in the scroll container's content coordinates, so a swap
      // that moved the scroll has dragged it away from the viewport it was
      // previewing, and every frame it survived past that point painted it
      // over the real content.
      const scroller = mountMeasureRef.current
        ? findNearestScroller(mountMeasureRef.current)
        : null;
      perfLog(
        `ghost ${id} removed anchor=${Math.round(ghost.anchorTop)} scroll=${
          scroller ? Math.round(scroller.scrollTop) : 'n/a'
        } ${fmtBox('win', mountMeasureRef.current)}`,
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const x = useTransform(ghost.progress, (p) =>
    ghost.type === 'under'
      ? `${slideStackPose.underRestX * (1 - p)}%`
      : `${(1 - p) * 100}%`,
  );
  const opacity = useTransform(ghost.progress, (p) =>
    ghost.type === 'under'
      ? slideStackPose.underRestOpacity +
        (1 - slideStackPose.underRestOpacity) * p
      : Math.min(1, p / slideStackPose.overFadeWindow),
  );

  return (
    <m.div
      ref={mountMeasureRef}
      // pointer-events-none: the ghost is a visual stand-in only — touches
      // must reach the real panes beneath it (e.g. to fast-forward a settle).
      // When the pane's scroll viewport is known, the ghost is a window of
      // exactly that height clipping its pre-scrolled content — a full-height
      // sheet made the compositor rasterize the target pane's entire list at
      // drag start (the measured jank on scrolled, content-heavy pages).
      // Without a measured viewport it falls back to the full-height sheet.
      className={cn(
        PANE_BASE_CLASSES,
        'pointer-events-none absolute inset-x-0',
        ghost.clipHeight === undefined ? 'min-h-full' : 'overflow-hidden',
        ghost.clipHeight === undefined &&
          ghost.contentOffsetY > 0 &&
          'overflow-hidden',
        !isComposite && className,
      )}
      data-slide-ghost={id}
      data-testid={`${testId ?? `slide-stack-pane-${id}`}-ghost`}
      style={{
        top: ghost.anchorTop,
        height: ghost.clipHeight,
        x,
        opacity,
        zIndex: ghost.type === 'under' ? 0 : 3,
      }}
    >
      {isComposite ? (
        // The stand-in previews the full landed viewport — header + pane
        // offset to the landing scroll — so whatever the swap reveals or
        // hides of the header is already in the preview.
        //
        // `flex min-h-full flex-col` is not decoration: it reproduces the
        // scroll container the real header and pane live in. Panes size
        // themselves against it (a step pane uses `grow` to fill the viewport
        // so its footer can sit at the bottom), and a plain wrapper leaves
        // them collapsed to content height — the preview then shows a
        // bottom-anchored footer floating mid-screen, which drops into place
        // when the real pane lands. `min-h-full` resolves against the window's
        // explicit clip height, so this matches the real viewport exactly.
        <div
          ref={contentRef}
          className="flex min-h-full flex-col"
          style={{ transform: `translateY(-${ghost.contentOffsetY}px)` }}
        >
          {ghost.header}
          <div className={cn(PANE_BASE_CLASSES, className)}>{children}</div>
        </div>
      ) : ghost.contentOffsetY > 0 ? (
        // Pane-only stand-in, pre-scrolled to the landing offset.
        <div
          ref={contentRef}
          style={{ transform: `translateY(-${ghost.contentOffsetY}px)` }}
        >
          {children}
        </div>
      ) : (
        children
      )}
    </m.div>
  );
}
