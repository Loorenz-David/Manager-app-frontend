import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { setAccessToken } from '@/lib/auth-token';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth.store';
import { ApiEnvelopeSchema } from '@/types/api';
import { useIssueCategoryConfigSelectionStore } from '@/features/items/store/issue-category-config-selection.store';
import { useItemCategorySelectionStore } from '@/features/items/store/item-category-selection.store';
import { useUpholsterySelectionStore } from '@/features/upholstery/store/upholstery-selection.store';
import { useWorkingSectionSelectionStore } from '@/features/working-sections/store/working-section-selection.store';

const SignOutResponseSchema = ApiEnvelopeSchema(z.object({}));

async function signOut() {
  await apiClient.post('/api/v1/auth/logout', SignOutResponseSchema, {});
  setAccessToken(null);
  useAuthStore.getState().clearAuth();
}

export function useSignOutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signOut,
    onSettled: () => {
      queryClient.clear();
      useUpholsterySelectionStore.getState().clear();
      useWorkingSectionSelectionStore.getState().clear();
      useItemCategorySelectionStore.getState().clear();
      useIssueCategoryConfigSelectionStore.getState().clear();
    },
  });
}
