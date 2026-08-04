# HANDOFF_TO_BACKEND_preorder_product_title_defaults_to_item_sku_20260804

> **RESOLVED 20260804.** Shipped in the same handoff round as §4a of
> `HANDOFF_TO_FRONTEND_sku_template_gapless_allocation_20260804` (the "copy" revision):
> `_create_preorder_sync_item_in_session` now defaults `product.title` from `product["sku"]`
> (which itself defaults from `item_sku`), exactly as requested. Confirmed against
> `test_create_task_preorder_sku_mirrors_item_integration.py::test_preorder_product_title_defaults_to_the_resolved_sku_when_omitted`
> and its override counterpart. `image_alt_text` was left `str | None` with no default and no
> required-field validation anywhere downstream, so it needed no equivalent change — omitting it
> entirely (as the frontend already does) was never blocked. Archived without further action.

## Metadata

- Handoff ID: `HANDOFF_TO_BACKEND_preorder_product_title_defaults_to_item_sku_20260804`
- Created at (UTC): `2026-08-04T00:00:00Z`
- Owner agent: `claude-opus-5`
- Responds to: `docs/handoff/from_backend/HANDOFF_TO_FRONTEND_sku_template_gapless_allocation_20260804.md`

## Request to backend

- **Required backend behavior:** make `shopify_preorder.product.title` optional and default it to
  the resolved item sku — exactly what §4 of the gapless-allocation handoff already does for
  `product.sku`. Same for `product.image_alt_text`.
- **User-facing impact:** none. Pre-order Shopify products keep the names they have today.
- **Desired timeline:** blocks the last phase of the frontend migration off the removed
  `reserve` endpoint. Phases 1, 2 and 4 of that migration proceed without it.

## Frontend context

**Why the frontend needs this.** `product.title` is required
(`_ShopifyPreorderProductBody.title: str`, `ShopifyPreorderProductInput.title: str`), and the
pre-order form has always filled it with the *same value as the sku*:

```ts
// packages/task-creation/src/lib/normalize-task-form-payload.ts
return {
  product: {
    title: sku,        // ← the reserved SKU
    sku,
    ...(imageClientId ? { image_id: imageClientId, image_alt_text: sku } : {}),
  },
}
```

That value came from `POST .../reserve`, which is now gone. Per §4 and §8.3 of the incoming
handoff, the form will stop sending `item.sku` and `product.sku` so the backend can assign the
real number gaplessly. After that change **the frontend has no sku at request-build time** —
and therefore nothing to put in the one field that is still mandatory.

The preview from `GET /api/v1/sku-templates/by-task-type/{task_type}` is not a substitute: §5
warns it can be stale under concurrency, so using it as the title would ship products titled
`PRE-7` carrying sku `PRE-8`. The form collects no separate product-name field, and inventing
one client-side (designer / category / article number) would silently rename every pre-order
product in Shopify — a product decision, not a technical one, and not something this migration
should smuggle in.

Defaulting `title` to the item sku is the only option that leaves observable behavior
**byte-identical to today** while letting the frontend drop the field.

- **Blocked frontend plan:** Phase 3 (submit payload) of the pre-order gapless-SKU migration.
  Phases 1, 2 and 4 are unblocked and proceed in parallel.
- **Clarifications required:** none — this mirrors a defaulting rule you have already shipped
  one field over.

## Expected backend deliverables

1. `title: str | None = None` on `_ShopifyPreorderProductBody`
   (`beyo_manager/routers/api_v1/tasks.py`) and on `ShopifyPreorderProductInput`
   (`beyo_manager/services/commands/tasks/requests/__init__.py`).
2. In `_create_preorder_sync_item_in_session`, alongside the existing sku default:

   ```python
   if not product.get("title") and item_sku:
       product["title"] = item_sku
   if not product.get("image_alt_text") and item_sku:
       product["image_alt_text"] = item_sku
   ```

   `image_alt_text` matters only when `image_id` is also sent; it is `= sku` today for the same
   reason `title` is.
3. A guard for the case where **neither** a caller-supplied `title` nor an `item_sku` exists —
   e.g. `shopify_preorder` sent with no `item`, or an existing item matched by
   `article_number` whose `sku` is `null` (§3 of the incoming handoff says this returns
   `item_sku: null`). `ProcessShopifyProductsItem.title` is a required `str` downstream, so an
   unguarded default would surface as an opaque internal parse error rather than a `400` the
   form can show. Preferred: a domain `ValidationError` naming the missing field.
4. Acceptance: an integration test asserting the queued
   `ShopifyProductSyncItem.normalized_payload_json` carries `title == item_sku` when `title` is
   omitted, and the caller's value verbatim when it is supplied — the same shape as
   `test_create_task_preorder_sku_mirrors_item_integration.py`.

## Interface expectations

- **Endpoint:** `PUT /api/v1/tasks` — unchanged route, unchanged response.
- **Request shape (the delta):**

  ```ts
  shopify_preorder?: {
    shop_integration_id: string
    product: {
      title?: string          // CHANGE: now optional, defaults to the resolved item sku
      sku?: string            // already optional, already defaults (shipped)
      price: string
      image_alt_text?: string // CHANGE: defaults to the resolved item sku when image_id is sent
      // ...unchanged
    }
    inventory: [...]
  }
  ```

  What the form will send once this lands — no `title`, no `sku`, no `image_alt_text`:

  ```json
  {
    "shop_integration_id": "shpint_1",
    "product": { "price": "5200.00", "tags": ["preorder"], "image_id": "img_..." },
    "metafields": { "quantity": "2" },
    "inventory": [{ "location_id": "gid://shopify/Location/1", "quantity": 2 }]
  }
  ```

- **Response shape:** unchanged.
- **Error cases:** one new — `title` omitted *and* no item sku resolvable (deliverable 3).
  A `400` with a message naming the field, not a `500`.
- **Socket events:** unchanged. `shopify.preorder.processed` still drives the form's submit
  overlay and must keep firing for `PREORDER_TASK`-origin syncs.

## Frontend contract implications

- `packages/task-creation/src/lib/normalize-task-form-payload.ts` →
  `buildShopifyPreorderSection` drops `title`, `sku` and `image_alt_text`, and loses its
  `!sku` early return (the section no longer depends on a sku existing client-side).
- No architecture contract files change: the pre-order Shopify section stays a sub-object of
  the task-creation payload, owned by `@beyo/task-creation`.
