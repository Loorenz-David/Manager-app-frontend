import { describe, expect, it } from "vitest";

import { mapShopifyCustomerLookupResultToFormFields } from "./map-shopify-customer-to-form-fields";

describe("mapShopifyCustomerLookupResultToFormFields", () => {
  it("maps the supported customer fields into the task form shape", () => {
    expect(
      mapShopifyCustomerLookupResultToFormFields({
        display_name: "Customer Name",
        primary_email: "customer@example.com",
        primary_phone_number: "+46701234567",
        address: {
          street_address: "Ship Street 1",
          city: "Stockholm",
          post_code: "12345",
          district: "Stockholm County",
          coordinates: {
            latitude: 59.1,
            longitude: 18.2,
          },
        },
      }),
    ).toEqual({
      "customer.display_name": "Customer Name",
      "customer.customer_type": "private",
      "customer.primary_email": "customer@example.com",
      "customer.primary_phone_number": "+46701234567",
      "customer.address.street": "Ship Street 1",
      "customer.address.city": "Stockholm",
      "customer.address.postal_code": "12345",
      "customer.address.coordinates.latitude": 59.1,
      "customer.address.coordinates.longitude": 18.2,
    });
  });

  it("drops null and blank values instead of writing empty strings", () => {
    expect(
      mapShopifyCustomerLookupResultToFormFields({
        display_name: "   ",
        primary_email: null,
        primary_phone_number: "",
        address: {
          street_address: "",
          city: "  ",
          post_code: null,
        },
      }),
    ).toEqual({
      "customer.display_name": undefined,
      "customer.customer_type": "private",
      "customer.primary_email": undefined,
      "customer.primary_phone_number": undefined,
      "customer.address.street": undefined,
      "customer.address.city": undefined,
      "customer.address.postal_code": undefined,
      "customer.address.coordinates.latitude": undefined,
      "customer.address.coordinates.longitude": undefined,
    });
  });
});
