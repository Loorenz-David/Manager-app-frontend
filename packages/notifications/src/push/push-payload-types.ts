export type PushPayloadData = {
  notification_client_id: string;
  entity_type: string | null;
  entity_client_id: string | null;
  task_client_id: string | null;
};

export type PushPayload = {
  title: string;
  body: string;
  data: PushPayloadData;
};
