import { TextArea, TextInput } from "@beyo/ui";

import type { EmailsSurfaceOpeners } from "../surface-ids";
import type { EmailTemplate } from "../types";
import {
  EmailTemplatePicker,
  type EmailTemplatePickerProps,
} from "./EmailTemplatePicker";

export type EmailComposerProps = {
  selectedTemplate: EmailTemplate | null;
  subject: string;
  textBody: string;
  surfaceOpeners?: EmailsSurfaceOpeners;
  disabled?: boolean;
  onSelectTemplate: EmailTemplatePickerProps["onSelectTemplate"];
  onSubjectChange: (value: string) => void;
  onTextBodyChange: (value: string) => void;
};

export function EmailComposer({
  selectedTemplate,
  subject,
  textBody,
  surfaceOpeners,
  disabled = false,
  onSelectTemplate,
  onSubjectChange,
  onTextBodyChange,
}: EmailComposerProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground" htmlFor="email-template-picker">
          Template
        </label>
        <div id="email-template-picker">
          <EmailTemplatePicker
            disabled={disabled}
            selectedTemplate={selectedTemplate}
            surfaceOpeners={surfaceOpeners}
            onSelectTemplate={onSelectTemplate}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground" htmlFor="coordination-email-subject">
          Subject
        </label>
        <TextInput
          disabled={disabled}
          id="coordination-email-subject"
          placeholder="Write the email subject"
          value={subject}
          onChange={(event) => {
            onSubjectChange(event.target.value);
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-foreground" htmlFor="coordination-email-body">
          Message
        </label>
        <TextArea
          disabled={disabled}
          id="coordination-email-body"
          placeholder="Write the email message"
          rows={10}
          value={textBody}
          onChange={(event) => {
            onTextBodyChange(event.target.value);
          }}
        />
      </div>
    </div>
  );
}
