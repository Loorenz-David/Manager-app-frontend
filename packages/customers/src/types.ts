import { z } from "zod";

import { AddressSchema } from "@beyo/lib";

export const CUSTOMER_TYPE = ["person", "company", "unknown"] as const;
export type CustomerType = (typeof CUSTOMER_TYPE)[number];

export const CustomerFieldsSchema = z.object({
  display_name: z.string().min(1, "Name is required.").max(255),
  customer_type: z.enum(CUSTOMER_TYPE, {
    message: "Select a customer type.",
  }),
  primary_email: z
    .string()
    .email("Enter a valid email.")
    .optional()
    .or(z.literal("")),
  primary_phone_number: z.string().optional(),
  address: AddressSchema,
});
export type CustomerFields = z.infer<typeof CustomerFieldsSchema>;
