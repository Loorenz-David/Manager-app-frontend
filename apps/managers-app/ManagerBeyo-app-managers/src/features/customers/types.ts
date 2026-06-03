import { z } from 'zod';

import { ClientIdSchema } from '@beyo/lib';
import type { CustomerId, UserId } from '@/types/common';
import { AddressSchema } from '@/types/common';

export const CUSTOMER_TYPE = ['person', 'company', 'unknown'] as const;
export const CUSTOMER_STATUS = ['active', 'inactive'] as const;

export const CustomerSchema = z.object({
  id: z.string().transform((v) => v as CustomerId),
  display_name: z.string(),
  customer_type: z.enum(CUSTOMER_TYPE),
  status: z.enum(CUSTOMER_STATUS),
  primary_phone_number: z.string().nullable(),
  primary_email: z.string().nullable(),
  address: AddressSchema,
  created_at: z.string().datetime({ offset: true }),
  created_by_id: z.string().transform((v) => v as UserId).nullable(),
  updated_at: z.string().datetime({ offset: true }).nullable(),
  updated_by_id: z.string().transform((v) => v as UserId).nullable(),
});

export type Customer = z.infer<typeof CustomerSchema>;
export type CustomerType = Customer['customer_type'];
export type CustomerStatus = Customer['status'];

export const CreateCustomerInputSchema = z.object({
  client_id: ClientIdSchema,
  display_name: z.string().min(1, 'Name is required.').max(255),
  customer_type: z.enum(CUSTOMER_TYPE, {
    message: 'Select a customer type.',
  }),
  primary_email: z
    .string()
    .email('Enter a valid email.')
    .optional()
    .or(z.literal('')),
  primary_phone_number: z.string().optional(),
  address: AddressSchema,
});
export type CreateCustomerInput = z.infer<typeof CreateCustomerInputSchema>;

export const UpdateCustomerInputSchema = z.object({
  id: z.string().transform((v) => v as CustomerId),
  customer_type: z.enum(CUSTOMER_TYPE),
  status: z.enum(CUSTOMER_STATUS),
  display_name: z.string().min(1, 'Name is required.').max(255).optional(),
  primary_email: z
    .string()
    .email('Enter a valid email.')
    .nullable()
    .optional()
    .or(z.literal('')),
  primary_phone_number: z.string().nullable().optional(),
  address: AddressSchema,
});
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerInputSchema>;

export const FindOrCreateCustomerInputSchema = z.object({
  client_id: ClientIdSchema,
  display_name: z.string().min(1, 'Name is required.').max(255),
  customer_type: z.enum(CUSTOMER_TYPE),
  primary_email: z.string().email().optional().or(z.literal('')),
  primary_phone_number: z.string().optional(),
  address: AddressSchema,
});
export type FindOrCreateCustomerInput = z.infer<typeof FindOrCreateCustomerInputSchema>;

export type ListCustomersParams = {
  limit?: number;
  offset?: number;
  q?: string;
  string_filters?: string;
};

export type CustomerViewModel = Customer & {
  type_label: string;
  status_variant: 'success' | 'muted';
  initial: string;
  contact_display: string | null;
};

export function toCustomerViewModel(customer: Customer): CustomerViewModel {
  const TYPE_LABELS: Record<CustomerType, string> = {
    person: 'Person',
    company: 'Company',
    unknown: 'Unknown',
  };

  return {
    ...customer,
    type_label: TYPE_LABELS[customer.customer_type],
    status_variant: customer.status === 'active' ? 'success' : 'muted',
    initial: customer.display_name.charAt(0).toUpperCase(),
    contact_display: customer.primary_phone_number ?? customer.primary_email ?? null,
  };
}

export function toOptimisticCustomer(input: CreateCustomerInput): Customer {
  return CustomerSchema.parse({
    id: input.client_id,
    display_name: input.display_name,
    customer_type: input.customer_type,
    status: 'active',
    primary_phone_number: input.primary_phone_number ?? null,
    primary_email: input.primary_email ?? null,
    address: input.address ?? null,
    created_at: new Date().toISOString(),
    created_by_id: null,
    updated_at: null,
    updated_by_id: null,
  });
}

// ─── Field composition schema (for form composition in other features) ────────

export const CustomerFieldsSchema = z.object({
  display_name: z.string().min(1, 'Name is required.').max(255),
  customer_type: z.enum(CUSTOMER_TYPE, {
    message: 'Select a customer type.',
  }),
  primary_email: z
    .string()
    .email('Enter a valid email.')
    .optional()
    .or(z.literal('')),
  primary_phone_number: z.string().optional(),
  address: AddressSchema,
});
export type CustomerFields = z.infer<typeof CustomerFieldsSchema>;
