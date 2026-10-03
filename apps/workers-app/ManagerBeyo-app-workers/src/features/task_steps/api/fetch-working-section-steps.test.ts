import { describe, expect, it, vi } from "vitest";
import { fetchWorkingSectionSteps } from "./fetch-working-section-steps";
import { taskStepKeys } from "./task-step-keys";

const get = vi.hoisted(() => vi.fn());
vi.mock("@beyo/api-client", () => ({ apiClient: { get } }));

describe("working-section category filters", () => {
  it("sends category IDs as an array and includes them in the query key", async () => {
    get.mockResolvedValue({ data: { steps_pagination: { items: [], has_more: false, limit: 20, offset: 0 } } });
    const params = {
      working_section_id: "section-1" as Parameters<typeof fetchWorkingSectionSteps>[0]["working_section_id"],
      task_types: "return,internal",
      item_categories: ["category-1", "category-2"],
    };
    await fetchWorkingSectionSteps(params);
    expect(get).toHaveBeenCalledWith(
      "/api/v1/working-sections/section-1/steps",
      expect.anything(),
      expect.objectContaining({
        task_types: "return,internal",
        item_categories: ["category-1", "category-2"],
      }),
    );
    expect(taskStepKeys.sectionList(params).at(-1)).toMatchObject({
      item_categories: ["category-1", "category-2"],
    });
  });
});
