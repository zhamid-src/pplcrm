export type EmailStatus = 'open' | 'closed' | 'resolved';

export const SPECIAL_FOLDERS = {
  ALL_OPEN: '1',
  CLOSED: '2',
  ASSIGNED_TO_ME: '6',
  UNASSIGNED: '8',
  FAVOURITES: '9',
} as const;
