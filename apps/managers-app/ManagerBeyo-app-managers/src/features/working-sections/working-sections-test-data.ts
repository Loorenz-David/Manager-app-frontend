import type { WorkingSectionOption } from './types';

export const TEST_WORKING_SECTIONS: WorkingSectionOption[] = [
  {
    client_id: 'ws_upholstery',
    name: 'Upholstery',
    image: 'https://placehold.co/32x32/6366f1/ffffff?text=U',
    dependencies: [],
    item_categories: [
      { client_id: 'itc_seat_1', name: 'Cushion', major_category: 'seat' },
    ],
    supported_issue_types: [{ client_id: 'ist_scratch', name: 'Scratch' }],
    members: [
      {
        client_id: 'usr_alice',
        username: 'Alice Martin',
        profile_picture: 'https://placehold.co/32x32/a3e635/000000?text=A',
      },
      {
        client_id: 'usr_bob',
        username: 'Bob Chen',
        profile_picture: 'https://placehold.co/32x32/facc15/000000?text=B',
      },
    ],
  },
  {
    client_id: 'ws_carpentry',
    name: 'Carpentry',
    image: 'https://placehold.co/32x32/f59e0b/ffffff?text=C',
    dependencies: [],
    item_categories: [
      { client_id: 'itc_wood_1', name: 'Chair', major_category: 'wood' },
    ],
    supported_issue_types: [],
    members: [
      {
        client_id: 'usr_carol',
        username: 'Carol Davis',
        profile_picture: 'https://placehold.co/32x32/fb923c/000000?text=C',
      },
    ],
  },
  {
    client_id: 'ws_finishing',
    name: 'Finishing',
    image: 'https://placehold.co/32x32/10b981/ffffff?text=F',
    dependencies: [{ client_id: 'ws_carpentry', name: 'Carpentry' }],
    item_categories: [
      { client_id: 'itc_wood_2', name: 'Table', major_category: 'wood' },
      { client_id: 'itc_seat_2', name: 'Armchair', major_category: 'seat' },
    ],
    supported_issue_types: [{ client_id: 'ist_finish', name: 'Finish damage' }],
    members: [
      {
        client_id: 'usr_dan',
        username: 'Dan Wilson',
        profile_picture: 'https://placehold.co/32x32/22d3ee/000000?text=D',
      },
      {
        client_id: 'usr_eve',
        username: 'Eve Johnson',
        profile_picture: 'https://placehold.co/32x32/c084fc/000000?text=E',
      },
      {
        client_id: 'usr_frank',
        username: 'Frank Lee',
        profile_picture: 'https://placehold.co/32x32/f43f5e/000000?text=F',
      },
    ],
  },
];
