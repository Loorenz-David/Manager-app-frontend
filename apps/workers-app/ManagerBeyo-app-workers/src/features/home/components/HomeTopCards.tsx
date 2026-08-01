import { ReassignedCard } from "./ReassignedCard";
import { WorkerStateCard } from "./WorkerStateCard";

/**
 * Rendered inside the sections-pane scroll container, above the section cards:
 * the worker's shift state, their reassigned-steps inbox, and the "My Sections"
 * label that heads the list below.
 */
export function HomeTopCards(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 px-4 pb-1" data-testid="home-top-cards">
      {/*
        Equal-width columns regardless of label length: every track is `1fr`,
        so the cards never size to their content.

        `grid-flow-col auto-cols-fr` rather than `grid-cols-2` because
        WorkerStateCard renders nothing for a manager-role session — a fixed
        two-column template would leave the Re-Assigned card stranded at half
        width beside an empty cell, whereas auto columns collapse to a single
        full-width track.
      */}
      <div className="grid grid-flow-col auto-cols-fr gap-0.5">
        <WorkerStateCard />
        <ReassignedCard />
      </div>
      <h2 className="pt-2 text-lg font-semibold text-foreground">
        My Sections
      </h2>
    </div>
  );
}
