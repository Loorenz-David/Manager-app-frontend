# HANDOFF_TO_FRONTEND_create_case_with_participants_contract_20260529

## Metadata

- Handoff ID: `HANDOFF_TO_FRONTEND_create_case_with_participants_contract_20260529`
- Created at (UTC): `2026-05-29T00:00:00Z`
- Owner agent: `GitHub Copilot (GPT-5.3-Codex)`
- Source plan: `N/A`
- Source summary: `N/A`

## Backend delivery context

- What backend implemented:
  - `POST /api/v1/cases` now supports optional `participants` during case creation.
  - The create-case flow creates the initial `CaseConversation` automatically.
  - Participant rows are created in the same transaction as the case and conversation.
  - The create-case flow can also create the first conversation message when `initial_message` is provided.
- API or contract changes:
  - New request field on create-case body: `participants: string[] | null`.
  - New optional request field on create-case body: `selected_all: boolean | null`.
  - New optional request field on create-case body: `skip_participants: string[] | null`.
  - New optional request field on create-case body: `initial_message: { client_id?: string | null; content: list; plain_text?: string } | null`.
- Feature flags/toggles:
  - None.

## Frontend action required

1. Update create-case request body typing to include optional `participants`.
2. Update create-case request body typing to include optional `selected_all`.
3. Update create-case request body typing to include optional `skip_participants`.
4. Update create-case request body typing to include optional `initial_message`.
5. If `selected_all=true`, frontend can skip sending `participants` (or send it; backend will ignore it).
6. Use `skip_participants` only when `selected_all=true` to exclude specific users from bulk inclusion.
7. Continue reading `participants_count` from the returned `case` payload to render participant chips/counters after create.

## Interface details

### Endpoint

- Method: `POST`
- URL: `/api/v1/cases`
- Auth: JWT required (`get_jwt_claims`)

### Request body

All fields are optional.

```json
{
  "client_id": "ca_01...",
  "case_type_id": "cty_01...",
  "type_label": "Customer return",
  "participants": ["usr_01A...", "usr_01B..."],
  "selected_all": true,
  "skip_participants": ["usr_01A..."],
  "initial_message": {
    "client_id": "ccm_01...",
    "content": [
      {
        "type": "text",
        "text": "We need to fix the broken frame."
      }
    ],
    "plain_text": "We need to fix the broken frame."
  }
}
```

### Request field behavior

- `client_id`:
  - Optional.
  - If provided, must be a valid `ca_` client ID and unique.
- `case_type_id`:
  - Optional.
  - If it resolves to an existing case type and `type_label` is omitted, backend uses the case type name as `type_label`.
- `type_label`:
  - Optional.
- `participants`:
  - Optional array of user IDs.
  - Duplicates are removed server-side.
  - The authenticated creator is excluded from inserted participants if included in the array.
- `selected_all`:
  - Optional boolean.
  - When `true`, backend ignores `participants` and adds all active users in the workspace as participants.
  - The authenticated creator is excluded from inserted participants.
- `skip_participants`:
  - Optional array of user IDs.
  - Only applies when `selected_all=true`.
  - Users in this list are excluded from bulk participant inclusion.
  - If `selected_all` is `false` or omitted, this field is ignored.
- `initial_message`:
  - Optional object that creates the first conversation message after the case and conversation are created.
  - Uses the same message content structure as `POST /api/v1/cases/{case_client_id}/conversations/{conversation_client_id}/messages`.
  - If provided, backend returns the created message in the create-case response as `initial_message`.

### Success response

```json
{
  "ok": true,
  "warnings": [],
  "data": {
    "case": {
      "client_id": "ca_01...",
      "state": "open",
      "case_type": {
        "name": "Customer return",
        "image": "https://..."
      },
      "participants_count": 2,
      "conversations_count": 1,
      "messages_count": 0,
      "created_at": "2026-05-29T10:30:00.000000+00:00",
      "created_by_id": "usr_01CREATOR...",
      "conversation_client_id": "ccv_01...",
      "conversation_messages_count": 0,
      "conversation_last_message_seq": 0,
      "conversation_created_at": "2026-05-29T10:30:00.000000+00:00"
    },
    "initial_message": {
      "client_id": "ccm_01...",
      "message_seq": 1,
      "content": [
        {
          "type": "text",
          "text": "We need to fix the broken frame."
        }
      ],
      "plain_text": "We need to fix the broken frame.",
      "has_been_edited": false,
      "has_been_deleted": false,
      "created_at": "2026-05-29T10:30:01.000000+00:00"
    }
  }
}
```

### Error response

```json
{
  "ok": false,
  "error": "..."
}
```

Common create-case errors:

- `409`: `Provided client_id is already in use.`
- `422`: invalid request body (for example malformed field type)
- `422`: invalid `client_id` prefix/format when provided

## Usage notes for frontend

- You do not need to call `POST /api/v1/cases/{case_client_id}/conversations` right after create; the first conversation is already created.
- If you send participants at create time, you do not need immediate follow-up calls to `POST /api/v1/cases/{case_client_id}/participants` for those same users.
- If you send `selected_all=true` at create time, backend will seed participants from all active workspace users automatically.
- Use `skip_participants` with `selected_all=true` when the UI needs "all except these users" behavior.
- If you send `initial_message`, backend creates the first conversation message in the same transaction and returns it in the response.
- Use the returned `conversation_client_id` if the UI should route directly to case chat after creation.

## Trace links

- Router: `backend/app/beyo_manager/routers/api_v1/cases.py`
- Command: `backend/app/beyo_manager/services/commands/cases/create_case.py`
- Request parser: `backend/app/beyo_manager/services/commands/cases/requests/__init__.py`
