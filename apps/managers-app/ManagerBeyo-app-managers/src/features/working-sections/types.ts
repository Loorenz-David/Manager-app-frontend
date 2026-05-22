import { z } from 'zod';

export type WorkingSectionMember = {
  client_id: string;
  username: string;
  profile_picture: string;
};

export type WorkingSectionOption = {
  client_id: string;
  name: string;
  image: string;
  members: WorkingSectionMember[];
};

export const WorkingSectionAssignmentSchema = z.object({
  working_section_id: z.string(),
  assigned_worker_id: z.string(),
});
export type WorkingSectionAssignment = z.infer<typeof WorkingSectionAssignmentSchema>;

export const WorkingSectionPickerFieldsSchema = z.object({
  working_section_assignments: z.array(WorkingSectionAssignmentSchema).default([]),
});
export type WorkingSectionPickerFields = z.input<typeof WorkingSectionPickerFieldsSchema>;
