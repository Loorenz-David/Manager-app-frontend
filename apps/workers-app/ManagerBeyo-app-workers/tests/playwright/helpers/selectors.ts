/**
 * `TaskStepCard` puts a testid on the card root *and* on four children
 * (`-image-`, `-body-`, `-actions-`, `-reassigned-`), all sharing the
 * `task-step-card-` prefix. Matching the bare prefix counts one card five
 * times — this negative lookahead selects card roots only.
 */
export const CARD_ROOT = /^task-step-card-(?!image-|body-|actions-|reassigned-)/;
