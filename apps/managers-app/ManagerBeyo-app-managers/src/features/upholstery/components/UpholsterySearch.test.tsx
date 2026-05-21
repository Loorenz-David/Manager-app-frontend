import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TEST_UPHOLSTERIES } from '@/features/upholstery/upholstery-test-data';

import { UpholsterySearch } from './UpholsterySearch';

describe('UpholsterySearch', () => {
  it('returns all items when the search text is empty', async () => {
    const handleFilteredResults = vi.fn();

    render(
      <UpholsterySearch
        items={TEST_UPHOLSTERIES}
        onFilteredResults={handleFilteredResults}
      />,
    );

    await waitFor(() => {
      expect(handleFilteredResults).toHaveBeenCalled();
    });

    const latestCall =
      handleFilteredResults.mock.calls[handleFilteredResults.mock.calls.length - 1][0];
    expect(latestCall).toHaveLength(TEST_UPHOLSTERIES.length);
  });

  it('filters by name or code with case-insensitive matching', async () => {
    const user = userEvent.setup();
    const handleFilteredResults = vi.fn();

    render(
      <UpholsterySearch
        items={TEST_UPHOLSTERIES}
        onFilteredResults={handleFilteredResults}
      />,
    );

    await user.type(screen.getByRole('searchbox'), 'vl-002');

    await waitFor(() => {
      const latestCall =
        handleFilteredResults.mock.calls[handleFilteredResults.mock.calls.length - 1][0];
      expect(latestCall).toHaveLength(1);
      expect(latestCall[0]?.name).toBe('Midnight Velvet');
    });
  });

  it('toggles sort order when the sort button is pressed', async () => {
    const user = userEvent.setup();
    const handleFilteredResults = vi.fn();

    render(
      <UpholsterySearch
        items={TEST_UPHOLSTERIES}
        onFilteredResults={handleFilteredResults}
      />,
    );

    await waitFor(() => {
      expect(handleFilteredResults).toHaveBeenCalled();
    });

    await user.click(screen.getByLabelText('Sort'));

    await waitFor(() => {
      const latestCall =
        handleFilteredResults.mock.calls[handleFilteredResults.mock.calls.length - 1][0];
      expect(latestCall[0]?.name).toBe('Tan Leather');
      expect(latestCall[latestCall.length - 1]?.name).toBe('Charcoal Wool');
    });
  });
});
