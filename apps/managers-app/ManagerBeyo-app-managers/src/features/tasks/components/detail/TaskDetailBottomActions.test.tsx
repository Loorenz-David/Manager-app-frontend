import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TaskDetailBottomActions } from './TaskDetailBottomActions';

const closeTopMock = vi.fn();
const useTaskDetailContextMock = vi.fn();

vi.mock('@/hooks/use-surface', () => ({
  useSurface: () => ({
    closeTop: closeTopMock,
  }),
}));

vi.mock('../../providers/TaskDetailProvider', () => ({
  useTaskDetailContext: () => useTaskDetailContextMock(),
}));

function buildContext({
  state = 'pending',
  taskSteps = [],
}: {
  state?: string;
  taskSteps?: Array<{ client_id: string }>;
} = {}) {
  return {
    openEditTask: vi.fn(),
    openWorkingSectionsSlide: vi.fn(),
    taskDetail: {
      task: {
        state,
      },
      task_steps: taskSteps,
    },
  };
}

describe('TaskDetailBottomActions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    closeTopMock.mockReset();
    useTaskDetailContextMock.mockReset();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('shows Assign Stages for pending tasks with no steps after the reveal delay', () => {
    useTaskDetailContextMock.mockReturnValue(buildContext());

    render(<TaskDetailBottomActions />);

    const ctaLayer = screen.getByTestId('task-detail-assign-stages-layer');
    expect(ctaLayer).toHaveAttribute('data-visible', 'false');
    expect(screen.getByTestId('task-detail-assign-stages-button')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(240);
    });

    expect(ctaLayer).toHaveAttribute('data-visible', 'true');
  });

  it('does not show Assign Stages when pending tasks already have steps', () => {
    useTaskDetailContextMock.mockReturnValue(
      buildContext({ taskSteps: [{ client_id: 'step_1' }] }),
    );

    render(<TaskDetailBottomActions />);

    expect(screen.queryByTestId('task-detail-assign-stages-button')).not.toBeInTheDocument();
  });

  it('does not show Assign Stages for non-pending tasks', () => {
    useTaskDetailContextMock.mockReturnValue(buildContext({ state: 'working' }));

    render(<TaskDetailBottomActions />);

    expect(screen.queryByTestId('task-detail-assign-stages-button')).not.toBeInTheDocument();
  });

  it('opens the working sections slide when Assign Stages is tapped', () => {
    const context = buildContext();
    useTaskDetailContextMock.mockReturnValue(context);

    render(<TaskDetailBottomActions />);

    screen.getByTestId('task-detail-assign-stages-button').click();

    expect(context.openWorkingSectionsSlide).toHaveBeenCalledTimes(1);
  });

  it('keeps Edit and Close & Back working', () => {
    const context = buildContext({ state: 'working' });
    useTaskDetailContextMock.mockReturnValue(context);

    render(<TaskDetailBottomActions />);

    screen.getByRole('button', { name: 'Edit' }).click();
    screen.getByRole('button', { name: 'Close & Back' }).click();

    expect(context.openEditTask).toHaveBeenCalledTimes(1);
    expect(closeTopMock).toHaveBeenCalledTimes(1);
  });
});
