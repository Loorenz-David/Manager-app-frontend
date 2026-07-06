import type { EmailTemplate } from "../types";

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    client_id: "email_template_pickup_ready",
    name: "Pickup Ready",
    subject: "Din order är klar för upphämtning",
    text_body:
      "Hej {{customer_name}},\n\nDin order är klar för upphämtning hos oss.\n\nVänligen svara på detta mejl om du har frågor.\n\nMed vänliga hälsningar,\nBeyo",
  },
  {
    client_id: "email_template_delivery_window",
    name: "Delivery Window",
    subject: "Leveransuppdatering för din order",
    text_body:
      "Hej {{customer_name}},\n\nVi vill samordna leveransen för din order.\nÅterkom gärna med vilken tid som passar dig bäst.\n\nMed vänliga hälsningar,\nBeyo",
  },
  {
    client_id: "email_template_follow_up",
    name: "Coordination Follow-up",
    subject: "Uppföljning kring din order",
    text_body:
      "Hej {{customer_name}},\n\nVi följer upp din order och vill gärna samordna nästa steg med dig.\n\nSvara gärna på detta mejl så hjälper vi dig vidare.\n\nMed vänliga hälsningar,\nBeyo",
  },
];

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  return EMAIL_TEMPLATES;
}
