import { z } from 'zod';

declare const _brand: unique symbol;

export type Branded<T, Brand extends string> = T & {
  readonly [_brand]: Brand;
};

export type UserId = Branded<string, 'UserId'>;
export type TaskId = Branded<string, 'TaskId'>;
export type TaskStepId = Branded<string, 'TaskStepId'>;
export type TaskNoteId = Branded<string, 'TaskNoteId'>;
export type ItemId = Branded<string, 'ItemId'>;
export type ItemImageId = Branded<string, 'ItemImageId'>;
export type ItemIssueId = Branded<string, 'ItemIssueId'>;
export type ItemUpholsteryId = Branded<string, 'ItemUpholsteryId'>;
export type CustomerId = Branded<string, 'CustomerId'>;
export type CaseId = Branded<string, 'CaseId'>;
export type CaseConversationId = Branded<string, 'CaseConversationId'>;
export type CaseConversationMessageId = Branded<string, 'CaseConversationMessageId'>;
export type CaseParticipantId = Branded<string, 'CaseParticipantId'>;
export type CaseLinkId = Branded<string, 'CaseLinkId'>;
export type WorkingSectionId = Branded<string, 'WorkingSectionId'>;
export type UpholsteryId = Branded<string, 'UpholsteryId'>;
export type UpholsteryInventoryId = Branded<string, 'UpholsteryInventoryId'>;
export type UpholsteryRequirementId = Branded<string, 'UpholsteryRequirementId'>;
export type WorkspaceId = Branded<string, 'WorkspaceId'>;

export const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const DateOnlySchema = z
  .string()
  .regex(DATE_ONLY_REGEX, 'Invalid date format. Expected YYYY-MM-DD.');
export type DateOnly = z.infer<typeof DateOnlySchema>;

export const AddressSchema = z
  .object({
    street: z.string().optional(),
    city: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
  })
  .passthrough()
  .nullable();
export type Address = z.infer<typeof AddressSchema>;

export const DecimalStringSchema = z.string().nullable();
export type DecimalString = z.infer<typeof DecimalStringSchema>;
