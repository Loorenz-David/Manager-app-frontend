export type PushPayloadData = {
  notification_client_id: string;
  entity_type: string;
  entity_client_id: string;
};

export type PushPayload = {
  title: string;
  body: string;
  data: PushPayloadData;
};
