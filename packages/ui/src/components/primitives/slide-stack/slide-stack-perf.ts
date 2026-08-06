/**
 * TEMPORARY instrumentation for the ghost/pane height-chain investigation.
 *
 * The question these logs answer: does the ghost stand-in lay its pane box out
 * at the same height, and its footer at the same place on screen, as the real
 * pane the swap replaces it with? A composite ghost nests the pane inside a
 * transform wrapper, which can break the flex chain (`min-h-full` + `grow`)
 * the real pane relies on to fill the viewport — a pane that collapses to its
 * content height carries a bottom-anchored footer up with it, and the footer
 * then visibly drops back down when the real pane lands.
 *
 * Everything is formatted into a single string per line: a console object with
 * several keys renders collapsed, which hides the very numbers being compared.
 * Boxes are viewport coordinates so ghost and pane numbers compare directly.
 * Remove once the behavior is confirmed.
 */

export function perfLog(message: string): void {
  console.log(`[slide-debug] ${Math.round(performance.now())} ${message}`);
}

/** `label=[t<top> h<height> b<bottom>]`, or `label=none`. */
export function fmtBox(label: string, element: Element | null | undefined): string {
  if (!element) return `${label}=none`;
  const rect = element.getBoundingClientRect();
  return `${label}=[t${Math.round(rect.top)} h${Math.round(rect.height)} b${Math.round(
    rect.bottom,
  )}]`;
}

/**
 * Which pane or ghost an element belongs to. Reporting the hit element alone
 * is useless here — everything on this page is a `div`, and a div inside the
 * outgoing pane looks exactly like a div inside the header. The owner is the
 * whole question.
 */
function ownerOf(element: Element): string {
  const owner = element.closest('[data-slide-pane],[data-slide-ghost]');
  if (!owner) return 'chrome';
  const ghostId = owner.getAttribute('data-slide-ghost');
  if (ghostId !== null) return `ghost:${ghostId}`;
  return `pane:${owner.getAttribute('data-slide-pane')}`;
}


let watching = false;

/**
 * Samples the header region every frame for the whole gesture and logs ONLY
 * when the picture changes. A flicker is by definition a change, so this turns
 * "something flashes near the end" into a timestamped list of exactly what
 * changed and when — without burying it in per-frame noise.
 *
 * Coverage is computed GEOMETRICALLY, never by hit testing: panes and ghosts
 * both set `pointer-events: none` while they animate, and
 * `document.elementsFromPoint` skips those entirely — so a hit test reports
 * the header as clear at the exact moment a pane is painted across it. Boxes
 * do not lie.
 *
 * `covers` lists whatever overlaps the strip the header occupies. With
 * `scroll` at 0 that strip belongs to the header, so anything listed there is
 * drawing over it.
 */
export function watchHeader(scroller: HTMLElement, durationMs = 2000): void {
  if (watching) return;
  watching = true;
  const start = performance.now();
  let previous = '';
  const tick = () => {
    const now = performance.now();
    const rect = scroller.getBoundingClientRect();
    const stripTop = rect.top;
    const stripBottom = rect.top + 40;
    // Every pane and stand-in currently in the document: where its box sits in
    // the viewport, and the two properties that decide whether it can cover
    // something. An outgoing pane lifted by scroll compensation shows up here
    // as a top above the strip — it has risen into the header's region.
    const covers: string[] = [];
    const boxes = Array.from(
      document.querySelectorAll('[data-slide-pane],[data-slide-ghost]'),
    )
      .map((element) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const owner = ownerOf(element);
        if (
          box.top < stripBottom &&
          box.bottom > stripTop &&
          style.visibility !== 'hidden' &&
          Number(style.opacity) > 0
        ) {
          covers.push(owner);
        }
        return `${owner}[t${Math.round(box.top)} b${Math.round(
          box.bottom,
        )} z${style.zIndex} o${Number(style.opacity).toFixed(2)}${
          style.clipPath && style.clipPath !== 'none' ? ' clipped' : ''
        }]`;
      })
      .join(' ');
    const signature = `covers=${covers.join(',') || 'none'} scroll=${Math.round(
      scroller.scrollTop,
    )} ${boxes || 'nothing'}`;
    if (signature !== previous) {
      perfLog(`watch +${Math.round(now - start)} ${signature}`);
      previous = signature;
    }
    if (now - start < durationMs) {
      requestAnimationFrame(tick);
    } else {
      watching = false;
      perfLog(`watch +${Math.round(now - start)} end`);
    }
  };
  requestAnimationFrame(tick);
}
