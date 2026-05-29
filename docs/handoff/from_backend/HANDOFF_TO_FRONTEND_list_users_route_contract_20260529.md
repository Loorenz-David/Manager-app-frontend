# HANDOFF_TO_FRONTEND_list_users_route_contract_20260529

## Metadata

- Handoff ID: `HANDOFF_TO_FRONTEND_list_users_route_contract_20260529`
- Created at (UTC): `2026-05-29T00:00:00Z`
- Owner agent: `GitHub Copilot (GPT-5.3-Codex)`

## Scope

This document explains how frontend should use `list_users_route`.

- Router symbol: `list_users_route`
- Endpoint: `GET /api/v1/users`
- Auth: JWT required
- Access: admin/manager roles only

## Query Parameters

All query parameters are optional.

- `q: string | null`
  - Free text for string matching.

- `string_filters: string | null`
  - Comma-separated list of fields where `q` is applied.
  - Allowed values:
    - `username`
    - `email`
    - `phone_number`
  - If omitted, `q` is applied to all allowed string fields.

- `role: string | null`
  - Comma-separated role names.
  - Matches users whose workspace role name is in the provided set.

- `working_sections: string | null`
  - Comma-separated working section names (not IDs).
  - Matches users assigned to at least one of those working sections in the same workspace.

- `limit: number`
  - Default: `50`
  - Minimum: `1`
  - Maximum: `200`

- `offset: number`
  - Default: `0`
  - Minimum: `0`

## Example Requests

List first page:

`GET /api/v1/users?limit=50&offset=0`

Search by email only:

`GET /api/v1/users?q=@company.com&string_filters=email`

Filter by roles:

`GET /api/v1/users?role=manager,worker`

Filter by working sections:

`GET /api/v1/users?working_sections=Cutting,Assembly`

Combine filters:

`GET /api/v1/users?q=john&string_filters=username,email&role=worker&working_sections=Assembly&limit=25&offset=0`

## Success Response Shape

Envelope:

```json
{
  "ok": true,
  "warnings": [],
  "data": {
    "users": [
      {
        "client_id": "usr_01...",
        "username": "john.doe",
        "email": "john@company.com",
        "phone_number": "+15550001111",
        "profile_picture": "https://...",
        "role": {
          "client_id": "wro_01...",
          "name": "worker"
        },
        "working_sections": [
          {
            "client_id": "wse_01...",
            "name": "Assembly",
            "image": "https://..."
          }
        ]
      }
    ],
    "users_pagination": {
      "has_more": true,
      "limit": 25,
      "offset": 0
    }
  }
}
```

## Empty State Response

```json
{
  "ok": true,
  "warnings": [],
  "data": {
    "users": [],
    "users_pagination": {
      "has_more": false,
      "limit": 50,
      "offset": 0
    }
  }
}
```

## Error Response Shape

```json
{
  "ok": false,
  "error": "..."
}
```

## Frontend Integration Notes

- Use `offset/limit` pagination; continue requesting next page while `users_pagination.has_more` is `true`.
- For search UI, send `q` and set `string_filters` based on selected fields.
- For role multi-select, join selected role names using commas.
- For working sections multi-select, send section names joined by commas.
- Backend already scopes to active users in current workspace.

## Trace Links

- Router: `backend/app/beyo_manager/routers/api_v1/users.py`
- Query: `backend/app/beyo_manager/services/queries/users/list_users.py`
- User serializer: `backend/app/beyo_manager/domain/users/serializers.py`
