import { useQuery } from "@tanstack/react-query";

import { getEmailTemplates } from "./get-email-templates";
import { emailTemplateKeys } from "./email-template-keys";

export function useEmailTemplatesQuery() {
  return useQuery({
    queryKey: emailTemplateKeys.list(),
    queryFn: getEmailTemplates,
  });
}
