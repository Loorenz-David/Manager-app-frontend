import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ScrollVisibilityProvider } from '@/components/primitives';
import type { WorkingSectionOption } from '@/features/working-sections/types';

import { WorkingSectionPickerField } from './WorkingSectionPickerField';

const openMock = vi.fn();
const useWorkingSectionPickerFlowMock = vi.fn();

vi.mock('@/features/working-sections/flows/use-working-section-picker.flow', () => ({
  useWorkingSectionPickerFlow: () => useWorkingSectionPickerFlowMock(),
}));

vi.mock('@/providers/SurfaceProvider', () => ({
  useSurfaceStore: {
    getState: () => ({
      open: openMock,
    }),
  },
}));

const OPTIONS: WorkingSectionOption[] = [
  {
    client_id: 'ws_upholstery',
    name: 'Upholstery',
    image: 'https://example.com/upholstery.png',
    dependencies: [],
    item_categories: [
      { client_id: 'itc_seat_1', name: 'Cushion', major_category: 'seat' },
    ],
    supported_issue_types: [],
    members: [
      {
        client_id: 'usr_alice',
        username: 'Alice Martin',
        profile_picture: 'https://example.com/alice.png',
      },
      {
        client_id: 'usr_bob',
        username: 'Bob Chen',
        profile_picture: 'https://example.com/bob.png',
      },
    ],
  },
  {
    client_id: 'ws_carpentry',
    name: 'Carpentry',
    image: 'https://example.com/carpentry.png',
    dependencies: [],
    item_categories: [
      { client_id: 'itc_wood_1', name: 'Chair', major_category: 'wood' },
    ],
    supported_issue_types: [],
    members: [
      {
        client_id: 'usr_carol',
        username: 'Carol Davis',
        profile_picture: 'https://example.com/carol.png',
      },
    ],
  },
  {
    client_id: 'ws_finishing',
    name: 'Finishing',
    image: 'https://example.com/finishing.png',
    dependencies: [{ client_id: 'ws_carpentry', name: 'Carpentry' }],
    item_categories: [
      { client_id: 'itc_wood_2', name: 'Table', major_category: 'wood' },
      { client_id: 'itc_seat_2', name: 'Armchair', major_category: 'seat' },
    ],
    supported_issue_types: [],
    members: [
      {
        client_id: 'usr_dan',
        username: 'Dan Wilson',
        profile_picture: 'https://example.com/dan.png',
      },
    ],
  },
  {
    client_id: 'ws_cleaning',
    name: 'Cleaning',
    image: null,
    dependencies: [],
    item_categories: [],
    supported_issue_types: [],
    members: [],
  },
];

function renderField(majorCategory?: string) {
  const Wrapper = () => {
    const methods = useForm({
      defaultValues: {
        working_section_assignments: [],
      },
    });

    return (
      <ScrollVisibilityProvider scrollElement={null}>
        <FormProvider {...methods}>
          <WorkingSectionPickerField majorCategory={majorCategory} />
        </FormProvider>
      </ScrollVisibilityProvider>
    );
  };

  return render(<Wrapper />);
}

describe('WorkingSectionPickerField', () => {
  beforeEach(() => {
    openMock.mockClear();
    useWorkingSectionPickerFlowMock.mockReturnValue({
      options: OPTIONS,
      isLoading: false,
    });
  });

  it('renders all working sections from the flow', () => {
    renderField();

    expect(screen.getByText('Upholstery')).toBeVisible();
    expect(screen.getByText('Carpentry')).toBeVisible();
  });

  it('renders a loading state when the flow is pending and empty', () => {
    useWorkingSectionPickerFlowMock.mockReturnValue({
      options: [],
      isLoading: true,
    });

    renderField();

    expect(screen.getByText('Loading working sections…')).toBeVisible();
    expect(screen.queryByTestId('working-section-box-ws_upholstery')).not.toBeInTheDocument();
  });

  it('selects the section when it has a single available member', async () => {
    const user = userEvent.setup();
    renderField();

    await user.click(screen.getByTestId('working-section-box-ws_carpentry'));

    expect(screen.getByTestId('working-section-box-ws_carpentry')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(openMock).not.toHaveBeenCalled();
  });

  it('selects a section with no members', async () => {
    const user = userEvent.setup();
    renderField();

    await user.click(screen.getByTestId('working-section-box-ws_cleaning'));

    expect(screen.getByTestId('working-section-box-ws_cleaning')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(openMock).not.toHaveBeenCalled();
  });

  it('filters sections by major category when provided', () => {
    renderField('wood');

    expect(screen.queryByText('Upholstery')).not.toBeInTheDocument();
    expect(screen.getByText('Carpentry')).toBeVisible();
    expect(screen.getByText('Finishing')).toBeVisible();
  });

  it('shows cross-category sections in either matching major category', () => {
    renderField('seat');

    expect(screen.getByText('Upholstery')).toBeVisible();
    expect(screen.getByText('Finishing')).toBeVisible();
    expect(screen.queryByText('Carpentry')).not.toBeInTheDocument();
  });

  it('replaces the current selection with the shortcut preset', async () => {
    const user = userEvent.setup();
    renderField();

    await user.click(screen.getByTestId('working-section-box-ws_cleaning'));
    await user.click(screen.getByTestId('shortcut-pill-full-job'));

    expect(screen.getByTestId('working-section-box-ws_upholstery')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('working-section-box-ws_carpentry')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('working-section-box-ws_finishing')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('working-section-box-ws_cleaning')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('replaces an earlier shortcut selection when a different pill is pressed', async () => {
    const user = userEvent.setup();
    renderField();

    await user.click(screen.getByTestId('shortcut-pill-upholstery-finish'));
    await user.click(screen.getByTestId('shortcut-pill-carpentry-finish'));

    expect(screen.getByTestId('working-section-box-ws_upholstery')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByTestId('working-section-box-ws_carpentry')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('working-section-box-ws_finishing')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
