import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TaskWorkingSectionsField } from './TaskWorkingSectionsField';

const useTaskDetailContextMock = vi.fn();

vi.mock('../../providers/TaskDetailProvider', () => ({
  useTaskDetailContext: () => useTaskDetailContextMock(),
}));

describe('TaskWorkingSectionsField', () => {
  beforeEach(() => {
    useTaskDetailContextMock.mockReset();
  });

  it('renders assigned and completed counts from task steps', () => {
    useTaskDetailContextMock.mockReturnValue({
      openWorkingSectionsSlide: vi.fn(),
      taskDetail: {
        task_steps: [
          { working_section_id: 'ws_1', closed_at: null },
          { working_section_id: null, closed_at: null },
          { working_section_id: 'ws_2', closed_at: '2026-05-24T00:00:00.000Z' },
        ],
      },
    });

    render(<TaskWorkingSectionsField />);

    expect(screen.getByTestId('working-sections-assigned-count')).toHaveTextContent('2 assigned');
    expect(screen.getByTestId('working-sections-completed-count')).toHaveTextContent('1 completed');
  });

  it('shows zero counts when task steps are empty', () => {
    useTaskDetailContextMock.mockReturnValue({
      openWorkingSectionsSlide: vi.fn(),
      taskDetail: {
        task_steps: [],
      },
    });

    render(<TaskWorkingSectionsField />);

    expect(screen.getByTestId('working-sections-assigned-count')).toHaveTextContent('0 assigned');
    expect(screen.getByTestId('working-sections-completed-count')).toHaveTextContent('0 completed');
  });

  it('opens the slide when pressed', async () => {
    const user = userEvent.setup();
    const openWorkingSectionsSlide = vi.fn();

    useTaskDetailContextMock.mockReturnValue({
      openWorkingSectionsSlide,
      taskDetail: {
        task_steps: [],
      },
    });

    render(<TaskWorkingSectionsField />);
    await user.click(screen.getByTestId('task-working-sections-field'));

    expect(openWorkingSectionsSlide).toHaveBeenCalledTimes(1);
  });
});
