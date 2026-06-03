import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { taskKeys } from '@/features/tasks/api/task-keys';
import type { TaskDetailRaw } from '@/features/tasks/types';
import { createTestQueryClient, createTestWrapper } from '@/test-utils/query-client';

const { removeTaskStepsBatchMock } = vi.hoisted(() => ({
  removeTaskStepsBatchMock: vi.fn(),
}));

vi.mock('../api/remove-task-step', () => ({
  removeTaskStepsBatch: removeTaskStepsBatchMock,
}));

import { useRemoveTaskStep } from './use-remove-task-step';

function buildTaskDetail(stepIds: string[]): TaskDetailRaw {
  return {
    task_steps: stepIds.map((stepId) => ({ client_id: stepId })),
  } as unknown as TaskDetailRaw;
}

describe('useRemoveTaskStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes step ids in batch, optimistically removes all, and invalidates on settle', async () => {
    let resolveMutation: ((value: { ok: true; data: { step_ids: string[] } }) => void) | undefined;
    const pendingMutation = new Promise<{ ok: true; data: { step_ids: string[] } }>((resolve) => {
      resolveMutation = resolve;
    });

    removeTaskStepsBatchMock.mockReturnValue(pendingMutation);

    const taskId = 'task_1';
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    queryClient.setQueryData(taskKeys.detail(taskId as never), buildTaskDetail(['step_a', 'step_b', 'step_c']));

    const { result } = renderHook(() => useRemoveTaskStep(taskId), {
      wrapper: createTestWrapper(queryClient),
    });

    const mutationPromise = result.current.mutateAsync({
      step_ids: ['step_a', 'step_c'],
    });

    await waitFor(() => {
      expect(
        (queryClient.getQueryData(taskKeys.detail(taskId as never)) as TaskDetailRaw).task_steps,
      ).toEqual([{ client_id: 'step_b' }]);
    });

    expect(removeTaskStepsBatchMock).toHaveBeenCalledWith({
      task_id: taskId,
      step_ids: ['step_a', 'step_c'],
    });

    resolveMutation?.({
      ok: true,
      data: { step_ids: ['step_a', 'step_c'] },
    });
    await mutationPromise;

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: taskKeys.detail(taskId as never),
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: taskKeys.lists(),
      });
    });
  });

  it('rolls back removed steps when batch delete fails', async () => {
    removeTaskStepsBatchMock.mockRejectedValue(new Error('delete failed'));

    const taskId = 'task_1';
    const queryClient = createTestQueryClient();
    const initialData = buildTaskDetail(['step_a', 'step_b', 'step_c']);
    queryClient.setQueryData(taskKeys.detail(taskId as never), initialData);

    const { result } = renderHook(() => useRemoveTaskStep(taskId), {
      wrapper: createTestWrapper(queryClient),
    });

    await expect(
      result.current.mutateAsync({
        step_ids: ['step_a', 'step_c'],
      }),
    ).rejects.toThrow('delete failed');

    expect(queryClient.getQueryData(taskKeys.detail(taskId as never))).toEqual(initialData);
  });
});
