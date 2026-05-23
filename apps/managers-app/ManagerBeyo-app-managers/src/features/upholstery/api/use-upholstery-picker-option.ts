import { useQuery } from '@tanstack/react-query';

import type { UpholsteryId } from '@/types/common';

import { fetchUpholstery } from './fetch-upholstery';
import { upholsteryKeys } from './upholstery-keys';

export function useUpholsteryPickerOptionQuery(clientId: string | null | undefined) {
  return useQuery({
    queryKey: upholsteryKeys.detail((clientId ?? '') as UpholsteryId),
    queryFn: () => fetchUpholstery(clientId!),
    enabled: Boolean(clientId),
  });
}
