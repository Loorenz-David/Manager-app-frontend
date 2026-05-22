import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: getMock,
  },
}));

import { fetchEntityImages } from './fetch-entity-images';
import { buildEntityImage } from '../test-utils';

describe('fetchEntityImages', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('returns the parsed image list from the API envelope', async () => {
    const images = [buildEntityImage(), buildEntityImage({ image: buildEntityImage().image })];
    getMock.mockResolvedValue({
      ok: true,
      data: { images },
    });

    await expect(
      fetchEntityImages({
        entity_type: 'item',
        entity_client_id: 'item_1',
      }),
    ).resolves.toEqual(images);

    expect(getMock).toHaveBeenCalledWith(
      '/api/v1/images',
      expect.anything(),
      {
        entity_type: 'item',
        entity_client_id: 'item_1',
      },
    );
  });

  it('rejects invalid request params before issuing the request', async () => {
    await expect(
      fetchEntityImages({
        entity_type: 'not-real' as never,
        entity_client_id: 'item_1',
      }),
    ).rejects.toThrow();

    expect(getMock).not.toHaveBeenCalled();
  });
});
