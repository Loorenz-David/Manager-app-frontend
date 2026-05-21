tables are:

## image_annotations

| Column          | Mapped Type               | SQLAlchemy Type                                                                        |
| :-------------- | :------------------------ | :------------------------------------------------------------------------------------- | --------- |
| client_id       | `str`                     | `String(64)`                                                                           |
| image_id        | `str`                     | `String(64)`                                                                           |
| annotation_type | `ImageAnnotationTypeEnum` | `SAEnum(ImageAnnotationTypeEnum, name='image_annotation_type_enum', create_type=True)` |
| data            | `dict                     | None`                                                                                  | `JSONB`   |
| accuracy        | `int                      | None`                                                                                  | `Integer` |
| created_by_id   | `str`                     | `String(64)`                                                                           |
| created_at      | `datetime`                | `DateTime(timezone=True)`                                                              |

## image_events

| Column    | Mapped Type | SQLAlchemy Type |
| :-------- | :---------- | :-------------- |
| client_id | `str`       | `String(64)`    |
| image_id  | `str`       | `String(64)`    |

## image_links

| Column           | Mapped Type               | SQLAlchemy Type                                                                         |
| :--------------- | :------------------------ | :-------------------------------------------------------------------------------------- |
| client_id        | `str`                     | `String(64)`                                                                            |
| image_id         | `str`                     | `String(64)`                                                                            |
| entity_type      | `ImageLinkEntityTypeEnum` | `SAEnum(ImageLinkEntityTypeEnum, name='image_link_entity_type_enum', create_type=True)` |
| entity_client_id | `str`                     | `String(64)`                                                                            |
| display_order    | `int`                     | `Integer`                                                                               |
| created_at       | `datetime`                | `DateTime(timezone=True)`                                                               |

## images

| Column           | Mapped Type                | SQLAlchemy Type                                                                          |
| :--------------- | :------------------------- | :--------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| client_id        | `str`                      | `String(64)`                                                                             |
| image_url        | `str`                      | `String(2048)`                                                                           |
| storage_provider | `ImageStorageProviderEnum` | `SAEnum(ImageStorageProviderEnum, name='image_storage_provider_enum', create_type=True)` |
| source_type      | `ImageSourceTypeEnum`      | `SAEnum(ImageSourceTypeEnum, name='image_source_type_enum', create_type=True)`           |
| source_reference | `ImageSourceReferenceEnum  | None`                                                                                    | `SAEnum(ImageSourceReferenceEnum, name='image_source_reference_enum', create_type=True)` |
| width_px         | `int                       | None`                                                                                    | `Integer`                                                                                |
| height_px        | `int                       | None`                                                                                    | `Integer`                                                                                |
| file_size_bytes  | `int                       | None`                                                                                    | `BigInteger`                                                                             |
| created_by_id    | `str`                      | `String(64)`                                                                             |
| updated_by_id    | `str                       | None`                                                                                    | `String(64)`                                                                             |
| deleted_by_id    | `str                       | None`                                                                                    | `String(64)`                                                                             |
| created_at       | `datetime`                 | `DateTime(timezone=True)`                                                                |
| updated_at       | `datetime                  | None`                                                                                    | `DateTime(timezone=True)`                                                                |
| deleted_at       | `datetime                  | None`                                                                                    | `DateTime(timezone=True)`                                                                |
| last_event_id    | `str                       | None`                                                                                    | `String(64)`                                                                             |

Routers:

### GET /api/v1/images

- **Tag**: images
- **OperationId**: list_images_route_api_v1_images_get

#### Parameters

| Name             | In    | Required | Type   |
| ---------------- | ----- | -------- | ------ |
| entity_type      | query | Yes      | string |
| entity_client_id | query | Yes      | string |

#### Request Body

None

#### Responses

- **200**: Successful Response
  - Content-Type: application/json
    | Field Path | Type | Required | Enum |
    | --- | --- | --- | --- |
    | ok | boolean | Yes | |
    | data.images[] | array[object] | Yes | |
    | data.images[].link_client_id | string | Yes | |
    | data.images[].image | object | Yes | |
    | data.images[].image.client_id | string | Yes | |
    | data.images[].image.image_url | string | Yes | |
    | data.images[].image.storage_provider | string | Yes | `s3`, `shopify`, `external` |
    | data.images[].image.source_type | string | Yes | `uploaded`, `shopify_sync`, `generated` |
    | data.images[].image.source_reference | string | No | `s3_image_url`, `shopify_image_url` |
    | data.images[].image.width_px | integer | No | |
    | data.images[].image.height_px | integer | No | |
    | data.images[].image.file_size_bytes | integer | No | |
    | data.images[].image.created_at | string | Yes | |
    | data.images[].image.last_event | object | No | |
    | data.images[].image.last_event.client_id | string | Yes | |
    | data.images[].image.last_event.event_type | string | Yes | `upload_item_image`, `upload_case_image`, `upload_message_image` |
    | data.images[].image.last_event.state | string | Yes | `requested`, `in_progress`, `completed`, `failed` |
    | data.images[].image.last_event.created_at | string | Yes | |
    | data.images[].image.last_event.last_error | string | No | `upload_failed`, `invalid_content_type`, `storage_unavailable`, `file_too_large`, `virus_detected` |
    | data.images[].image.events[] | array[object] | Yes | |
    | data.images[].image.image_annotation | object | No | |
    | data.images[].entity_type | string | Yes | `item`, `case`, `case_conversation_message` |
    | data.images[].entity_client_id | string | Yes | |
    | data.images[].display_order | integer | Yes | |
    | warnings[] | string | Yes | |
- **422**: Validation Error
  - Content-Type: application/json
    | Field Path | Type | Required | Enum |
    | --- | --- | --- | --- |
    | detail[].loc | array[integer | string] | Yes | |
    | detail[].msg | string | Yes | |
    | detail[].type | string | Yes | |

### POST /api/v1/images/confirm-upload

- **Tag**: images
- **OperationId**: image_confirm_upload_route_api_v1_images_confirm_upload_post

#### Parameters

None

#### Request Body

- **Content-Type**: application/json
  | Field Path | Type | Required | Enum |
  | --- | --- | --- | --- |
  | pending_upload_client_id | string | Yes | |
  | entity_type | string | Yes | |
  | entity_client_id | string | Yes | |

#### Responses

- **200**: Successful Response
  - Content-Type: application/json
    | Field Path | Type | Required | Enum |
    | --- | --- | --- | --- |
    | ok | boolean | Yes | |
    | data.image | object | Yes | |
    | data.image.client_id | string | Yes | |
    | data.image.image_url | string | Yes | |
    | data.image.storage_provider | string | Yes | `s3`, `shopify`, `external` |
    | data.image.source_type | string | Yes | `uploaded`, `shopify_sync`, `generated` |
    | data.image.source_reference | string | No | `s3_image_url`, `shopify_image_url` |
    | data.image.width_px | integer | No | |
    | data.image.height_px | integer | No | |
    | data.image.file_size_bytes | integer | No | |
    | data.image.created_at | string | Yes | |
    | data.image.last_event | object | No | |
    | data.image.events[] | array[object] | Yes | |
    | data.image.image_annotation | object | No | |
    | warnings[] | string | Yes | |
- **422**: Validation Error
  - Content-Type: application/json
    | Field Path | Type | Required | Enum |
    | --- | --- | --- | --- |
    | detail[].loc | array[integer | string] | Yes | |
    | detail[].msg | string | Yes | |
    | detail[].type | string | Yes | |

### DELETE /api/v1/images/links

- **Tag**: images
- **OperationId**: unlink_image_route_api_v1_images_links_delete

#### Parameters

None

#### Request Body

- **Content-Type**: application/json
  | Field Path | Type | Required | Enum |
  | --- | --- | --- | --- |
  | image_client_id | string | Yes | |
  | entity_type | string | Yes | |
  | entity_client_id | string | Yes | |

#### Responses

- **200**: Successful Response
  - Content-Type: application/json
    | Field Path | Type | Required | Enum |
    | --- | --- | --- | --- |
    | ok | boolean | Yes | |
    | data.unlinked | boolean | Yes | |
    | warnings[] | string | Yes | |
- **422**: Validation Error
  - Content-Type: application/json
    | Field Path | Type | Required | Enum |
    | --- | --- | --- | --- |
    | detail[].loc | array[integer | string] | Yes | |
    | detail[].msg | string | Yes | |
    | detail[].type | string | Yes | |

### POST /api/v1/images/reorder

- **Tag**: images
- **OperationId**: reorder_links_route_api_v1_images_reorder_post

#### Parameters

None

#### Request Body

- **Content-Type**: application/json
  | Field Path | Type | Required | Enum |
  | --- | --- | --- | --- |
  | entity_type | string | Yes | |
  | entity_client_id | string | Yes | |
  | ordered_image_client_ids | array[string] | Yes | |

#### Responses

- **200**: Successful Response
  - Content-Type: application/json
    | Field Path | Type | Required | Enum |
    | --- | --- | --- | --- |
    | ok | boolean | Yes | |
    | data.reordered | integer | Yes | |
    | warnings[] | string | Yes | |
- **422**: Validation Error
  - Content-Type: application/json
    | Field Path | Type | Required | Enum |
    | --- | --- | --- | --- |
    | detail[].loc | array[integer | string] | Yes | |
    | detail[].msg | string | Yes | |
    | detail[].type | string | Yes | |

### POST /api/v1/images/upload-url

- **Tag**: images
- **OperationId**: image_upload_url_route_api_v1_images_upload_url_post

#### Parameters

None

#### Request Body

- **Content-Type**: application/json
  | Field Path | Type | Required | Enum |
  | --- | --- | --- | --- |
  | entity_type | string | Yes | |
  | entity_client_id | string | Yes | |
  | file_name | string | Yes | |
  | content_type | string | Yes | |
  | file_size_bytes | integer | No | |

#### Responses

- **200**: Successful Response
  - Content-Type: application/json
    | Field Path | Type | Required | Enum |
    | --- | --- | --- | --- |
    | ok | boolean | Yes | |
    | data.upload_url | string | Yes | |
    | data.pending_upload_client_id | string | Yes | |
    | data.storage_key | string | Yes | |
    | data.expires_in | integer | Yes | |
    | warnings[] | string | Yes | |
- **422**: Validation Error
  - Content-Type: application/json
    | Field Path | Type | Required | Enum |
    | --- | --- | --- | --- |
    | detail[].loc | array[integer | string] | Yes | |
    | detail[].msg | string | Yes | |
    | detail[].type | string | Yes | |

### DELETE /api/v1/images/{image_client_id}

- **Tag**: images
- **OperationId**: soft_delete_image_route_api_v1_images**image_client_id**delete

#### Parameters

| Name            | In   | Required | Type   |
| --------------- | ---- | -------- | ------ |
| image_client_id | path | Yes      | string |

#### Request Body

None

#### Responses

- **200**: Successful Response
  - Content-Type: application/json
    | Field Path | Type | Required | Enum |
    | --- | --- | --- | --- |
    | ok | boolean | Yes | |
    | data.client_id | string | Yes | |
    | warnings[] | string | Yes | |
- **422**: Validation Error
  - Content-Type: application/json
    | Field Path | Type | Required | Enum |
    | --- | --- | --- | --- |
    | detail[].loc | array[integer | string] | Yes | |
    | detail[].msg | string | Yes | |
    | detail[].type | string | Yes | |

### GET /api/v1/images/{image_client_id}

- **Tag**: images
- **OperationId**: get_image_route_api_v1_images**image_client_id**get

#### Parameters

| Name            | In   | Required | Type   |
| --------------- | ---- | -------- | ------ |
| image_client_id | path | Yes      | string |

#### Request Body

None

#### Responses

- **200**: Successful Response
  - Content-Type: application/json
    | Field Path | Type | Required | Enum |
    | --- | --- | --- | --- |
    | ok | boolean | Yes | |
    | data.image | object | Yes | |
    | data.image.client_id | string | Yes | |
    | data.image.image_url | string | Yes | |
    | data.image.storage_provider | string | Yes | `s3`, `shopify`, `external` |
    | data.image.source_type | string | Yes | `uploaded`, `shopify_sync`, `generated` |
    | data.image.source_reference | string | No | `s3_image_url`, `shopify_image_url` |
    | data.image.width_px | integer | No | |
    | data.image.height_px | integer | No | |
    | data.image.file_size_bytes | integer | No | |
    | data.image.created_at | string | Yes | |
    | data.image.last_event | object | No | |
    | data.image.last_event.client_id | string | Yes | |
    | data.image.last_event.event_type | string | Yes | `upload_item_image`, `upload_case_image`, `upload_message_image` |
    | data.image.last_event.state | string | Yes | `requested`, `in_progress`, `completed`, `failed` |
    | data.image.last_event.created_at | string | Yes | |
    | data.image.last_event.last_error | string | No | `upload_failed`, `invalid_content_type`, `storage_unavailable`, `file_too_large`, `virus_detected` |
    | data.image.events[] | array[object] | Yes | |
    | data.image.events[].client_id | string | Yes | |
    | data.image.events[].event_type | string | Yes | `upload_item_image`, `upload_case_image`, `upload_message_image` |
    | data.image.events[].state | string | Yes | `requested`, `in_progress`, `completed`, `failed` |
    | data.image.events[].created_at | string | Yes | |
    | data.image.events[].last_error | string | No | `upload_failed`, `invalid_content_type`, `storage_unavailable`, `file_too_large`, `virus_detected` |
    | data.image.image_annotation | object | No | |
    | data.image.image_annotation.client_id | string | Yes | |
    | data.image.image_annotation.annotation_type | string | Yes | `draw`, `arrow`, `circle`, `rectangle`, `text`, `measurement`, `highlight` |
    | data.image.image_annotation.data | object | No | |
    | data.image.image_annotation.accuracy | integer | No | |
    | data.image.image_annotation.created_at | string | Yes | |
    | warnings[] | string | Yes | |
- **422**: Validation Error
  - Content-Type: application/json
    | Field Path | Type | Required | Enum |
    | --- | --- | --- | --- |
    | detail[].loc | array[integer | string] | Yes | |
    | detail[].msg | string | Yes | |
    | detail[].type | string | Yes | |

### POST /api/v1/images/{image_client_id}/annotations

- **Tag**: images
- **OperationId**: create_annotation_route_api_v1_images**image_client_id**annotations_post

#### Parameters

| Name            | In   | Required | Type   |
| --------------- | ---- | -------- | ------ |
| image_client_id | path | Yes      | string |

#### Request Body

- **Content-Type**: application/json
  | Field Path | Type | Required | Enum |
  | --- | --- | --- | --- |
  | image_client_id | string | Yes | |
  | annotation_type | string | Yes | |
  | data | object | Yes | |
  | accuracy | integer | No | |

#### Responses

- **200**: Successful Response
  - Content-Type: application/json
    | Field Path | Type | Required | Enum |
    | --- | --- | --- | --- |
    | ok | boolean | Yes | |
    | data.client_id | string | Yes | |
    | warnings[] | string | Yes | |
- **422**: Validation Error
  - Content-Type: application/json
    | Field Path | Type | Required | Enum |
    | --- | --- | --- | --- |
    | detail[].loc | array[integer | string] | Yes | |
    | detail[].msg | string | Yes | |
    | detail[].type | string | Yes | |

### GET /api/v1/images/{image_client_id}/download-url

- **Tag**: images
- **OperationId**: image_download_url_route_api_v1_images**image_client_id**download_url_get

#### Parameters

| Name            | In   | Required | Type   |
| --------------- | ---- | -------- | ------ |
| image_client_id | path | Yes      | string |

#### Request Body

None

#### Responses

- **200**: Successful Response
  - Content-Type: application/json
    | Field Path | Type | Required | Enum |
    | --- | --- | --- | --- |
    | ok | boolean | Yes | |
    | data.download_url | string | Yes | |
    | data.expires_in | integer | Yes | |
    | warnings[] | string | Yes | |
- **422**: Validation Error
  - Content-Type: application/json
    | Field Path | Type | Required | Enum |
    | --- | --- | --- | --- |
    | detail[].loc | array[integer | string] | Yes | |
    | detail[].msg | string | Yes | |
    | detail[].type | string | Yes | |
