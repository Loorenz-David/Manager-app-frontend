import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { taskKeys } from '@/features/tasks/api/task-keys';
import type { TaskDetailRaw } from '@/features/tasks/types';
import { createTestQueryClient, createTestWrapper } from '@/test-utils/query-client';

const { addTaskStepMock } = vi.hoisted(() => ({
  addTaskStepMock: vi.fn(),
}));

vi.mock('../api/add-task-step', () => ({
  addTaskStep: addTaskStepMock,
}));

import { useAddTaskStep } from './use-add-task-step';

function buildTaskDetail(stepIds: string[]): TaskDetailRaw {
  return {
    task_steps: stepIds.map((stepId) => ({ client_id: stepId })),
  } as unknown as TaskDetailRaw;
}

describe('useAddTaskStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends batch payload as array-of-one and invalidates task queries on settle', async () => {
    addTaskStepMock.mockResolvedValue({
      ok: true,
      data: { step_ids: ['tsp_1'] },
    });

    const taskId = 'task_1';
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const initialData = buildTaskDetail(['existing_step']);
    queryClient.setQueryData(taskKeys.detail(taskId as never), initialData);

    const { result } = renderHook(() => useAddTaskStep(taskId), {
      wrapper: createTestWrapper(queryClient),
    });

    await result.current.mutateAsync({
      working_section_id: 'wsec_upholstery',
      worker_id: 'usr_worker_1',
      working_section_name_snapshot: 'Upholstery',
      assigned_worker_display_name_snapshot: 'Ana',
    });

    expect(addTaskStepMock).toHaveBeenCalledWith({
      task_id: taskId,
      steps: [
        {
          working_section_id: 'wsec_upholstery',
          worker_id: 'usr_worker_1',
        },
      ],
    });

    expect(queryClient.getQueryData(taskKeys.detail(taskId as never))).toEqual(initialData);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: taskKeys.detail(taskId as never),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: taskKeys.lists(),
      });
    });
  });

  it('keeps cached task detail unchanged when create mutation fails', async () => {
    addTaskStepMock.mockRejectedValue(new Error('create failed'));

    const taskId = 'task_1';
    const queryClient = createTestQueryClient();
    const initialData = buildTaskDetail(['existing_step']);
    queryClient.setQueryData(taskKeys.detail(taskId as never), initialData);

    const { result } = renderHook(() => useAddTaskStep(taskId), {
      wrapper: createTestWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({
        working_section_id: 'wsec_upholstery',
      }),
    ).rejects.toThrow('create failed');

    expect(queryClient.getQueryData(taskKeys.detail(taskId as never))).toEqual(initialData);
  });
});
