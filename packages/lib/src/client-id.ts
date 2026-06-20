import { ulid } from 'ulid';
import { z } from 'zod';

// Mirrors docs/architecture/backend/tables/client_id_prefix_map.md exactly.
export const CLIENT_ID_PREFIXES = {
  AuditLog: 'aud',
  Case: 'ca',
  CaseConversation: 'ccv',
  CaseConversationMessage: 'ccm',
  CaseLink: 'clk',
  CaseParticipant: 'cpa',
  CaseType: 'cty',
  ContentMention: 'cmt',
  ContentMentionLink: 'cml',
  Customer: 'cus',
  ExecutionPayload: 'epl',
  ExecutionTask: 'tsk',
  HistoryRecord: 'hrec',
  HistoryRecordLink: 'hrlk',
  Image: 'img',
  ImageAnnotation: 'ian',
  ImageEvent: 'iev',
  ImageLink: 'iml',
  Item: 'itm',
  ItemCategory: 'itc',
  ItemIssue: 'iti',
  ItemUpholstery: 'iup',
  ItemUpholsteryRequirement: 'iur',
  Notification: 'not',
  NotificationPin: 'npin',
  PendingUpload: 'upl',
  PushSubscription: 'psu',
  RecurringScheduler: 'rsch',
  Role: 'role',
  StaticCost: 'stc',
  StepStateRecord: 'ssr',
  TaskEvent: 'tev',
  TaskItem: 'tki',
  TaskNote: 'tno',
  TaskStep: 'tsp',
  TaskStepAssignmentRecord: 'tsar',
  TaskStepDependency: 'tsd',
  Upholstery: 'uph',
  UpholsteryInventory: 'uphi',
  UpholsteryOrder: 'uor',
  User: 'usr',
  UserAppViewRecord: 'uavr',
  UserDailyWorkStats: 'udwr',
  UserHistoryRecord: 'uhr',
  UserLifetimeStats: 'usr_stat',
  UserSectionDailyWorkStats: 'usdwr',
  UserShiftStateRecord: 'ussr',
  UserWorkProfile: 'uwp',
  Workspace: 'ws',
  WorkspaceMembership: 'wsm',
  WorkspaceRole: 'wsr',
  WorkingSection: 'wks',
  WorkingSectionDependency: 'wsd',
  WorkingSectionItemCategory: 'wsic',
  WorkingSectionMembership: 'wsmem',
  WorkingSectionSupportedIssueType: 'wssit',
  WorkingSectionDailyWorkStats: 'wsdws',
} as const;

export type ClientIdEntity = keyof typeof CLIENT_ID_PREFIXES;
export type ClientIdPrefix = (typeof CLIENT_ID_PREFIXES)[ClientIdEntity];

export function generateClientId(entity: ClientIdEntity): string {
  return `${CLIENT_ID_PREFIXES[entity]}_${ulid()}`;
}

export const CLIENT_ID_REGEX = /^[a-z][a-z_]*_[0-9A-HJKMNP-TV-Z]{26}$/;

export const ClientIdSchema = z
  .string()
  .regex(CLIENT_ID_REGEX, 'Invalid client ID format. Expected {prefix}_{ulid}.');
