import { describe, expect, it } from "vitest";

import {
  toOrderCardViewModel,
  toOrderingItemCardViewModel,
  toShortageCardViewModel,
} from "./upholstery-ordering-dto";
import { formatLocalDate, formatMetersValue } from "./format";

describe("upholstery-ordering dto", () => {
  it("maps shortage rows to cards", () => {
    const card = toShortageCardViewModel({
      upholstery_id: "uph_1",
      upholstery_name: "Velvet Blue",
      upholstery_code: "VB-01",
      upholstery_image_url: "https://example.com/upholstery.jpg",
      item_count: 3,
      amount_to_order_meters: 4.25,
      earliest_due_date: "2026-06-20",
    });

    expect(card).toMatchObject({
      upholsteryId: "uph_1",
      name: "Velvet Blue",
      code: "VB-01",
      imageUrl: "https://example.com/upholstery.jpg",
      itemCount: 3,
      totalAmountMeters: 4.25,
      totalAmountLabel: formatMetersValue(4.25),
      earliestDueDate: "2026-06-20",
      earliestDueDateLabel: formatLocalDate("2026-06-20"),
    });
  });

  it("computes received, remaining, and received-date labeling for orders", () => {
    const card = toOrderCardViewModel({
      client_id: "uor_1",
      upholstery_id: "uph_1",
      upholstery_name: "Velvet Blue",
      upholstery_code: "VB-01",
      upholstery_image_url: null,
      order_amount_meters: 8,
      received_amount_meters: 3.5,
      expected_receive_at: "2026-06-19",
      received_at: "2026-06-20",
      state: "partially_received",
      supplier_id: null,
    });

    expect(card).toMatchObject({
      orderId: "uor_1",
      orderAmountMeters: 8,
      orderAmountLabel: formatMetersValue(8),
      receivedAmountMeters: 3.5,
      receivedAmountLabel: formatMetersValue(3.5),
      remainingReceivableMeters: 4.5,
      remainingReceivableLabel: formatMetersValue(4.5),
      dateLabel: formatLocalDate("2026-06-19"),
      stateLabel: "Partially Received",
    });

    const receivedCard = toOrderCardViewModel({
      client_id: "uor_2",
      upholstery_id: "uph_1",
      upholstery_name: "Velvet Blue",
      upholstery_code: "VB-01",
      upholstery_image_url: null,
      order_amount_meters: 8,
      received_amount_meters: 8,
      expected_receive_at: "2026-06-19",
      received_at: "2026-06-21",
      state: "received",
      supplier_id: null,
    });

    expect(receivedCard.dateLabel).toBe(formatLocalDate("2026-06-21"));
  });

  it("returns null when item upholstery is absent and keeps null amount labels", () => {
    expect(
      toOrderingItemCardViewModel({
        task: {
          client_id: "task_1",
          task_scalar_id: 1,
          task_type: "return",
          priority: "normal",
          state: "pending",
          title: null,
          summary: null,
          return_source: "after_purchase",
          item_location: null,
          return_method: null,
          fulfillment_method: "delivery",
          additional_details: null,
          ready_by_at: "2026-06-20",
          scheduled_start_at: null,
          scheduled_end_at: null,
          customer_id: null,
          primary_phone_number: null,
          secondary_phone_number: null,
          primary_email: null,
          secondary_email: null,
          address: null,
          created_at: "2026-06-10T00:00:00.000Z",
          updated_at: null,
          closed_at: null,
          is_deleted: false,
          deleted_at: null,
        },
        primary_item: null,
        item_images: [],
        item_upholstery: null,
      }),
    ).toBeNull();

    const card = toOrderingItemCardViewModel({
      task: {
        client_id: "task_2",
        task_scalar_id: 2,
        task_type: "return",
        priority: "normal",
        state: "pending",
        title: null,
        summary: null,
        return_source: "after_purchase",
        item_location: null,
        return_method: null,
        fulfillment_method: "delivery",
        additional_details: null,
        ready_by_at: "2026-06-22",
        scheduled_start_at: null,
        scheduled_end_at: null,
        customer_id: null,
        primary_phone_number: null,
        secondary_phone_number: null,
        primary_email: null,
        secondary_email: null,
        address: null,
        created_at: "2026-06-10T00:00:00.000Z",
        updated_at: null,
        closed_at: null,
        is_deleted: false,
        deleted_at: null,
      },
      primary_item: {
        client_id: "item_1",
        article_number: "ART-1",
        sku: "SKU-1",
        state: "pending",
        item_category_id: null,
        quantity: 1,
        designer: null,
        height_in_cm: null,
        width_in_cm: null,
        depth_in_cm: null,
        item_value_minor: null,
        item_cost_minor: null,
        item_currency: null,
        item_position: null,
        external_id: null,
        external_url: null,
        external_source: null,
        external_order_id: null,
        item_category_snapshot: null,
        item_major_category_snapshot: "Seat",
      },
      item_images: [],
      item_upholstery: {
        client_id: "iup_1",
        amount_meters: null,
      },
    });

    expect(card).toMatchObject({
      itemUpholsteryId: "iup_1",
      amountMeters: 0,
      amountLabel: null,
    });
  });
});
