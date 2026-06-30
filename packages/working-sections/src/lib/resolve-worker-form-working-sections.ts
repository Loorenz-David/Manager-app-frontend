import type { WorkingSectionAssignment, WorkingSectionOption } from "../types";

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function isPhotographySection(section: WorkingSectionOption): boolean {
  return normalizeName(section.name).includes("photography");
}

export function filterWorkingSectionsForMajorCategory(
  options: WorkingSectionOption[],
  majorCategory?: string,
): WorkingSectionOption[] {
  if (majorCategory === undefined) {
    return options;
  }

  return options.filter((section) => {
    const supportsMajorCategory = section.item_categories.some(
      (itemCategory) => itemCategory.major_category === majorCategory,
    );

    if (supportsMajorCategory) {
      return true;
    }

    return (
      (majorCategory === "seat" || majorCategory === "wood") &&
      isPhotographySection(section)
    );
  });
}

export function resolveDefaultWoodFixSection(
  options: WorkingSectionOption[],
): WorkingSectionOption | null {
  return (
    options.find((section) => normalizeName(section.name).includes("wood fix")) ??
    null
  );
}

export function resolveCleaningSections(
  options: WorkingSectionOption[],
): WorkingSectionOption[] {
  return options.filter((section) =>
    normalizeName(section.name).includes("cleaning"),
  );
}

export function resolveOilTreatmentSections(
  options: WorkingSectionOption[],
): WorkingSectionOption[] {
  return options.filter((section) => {
    const name = normalizeName(section.name);
    return name.includes("ground oil") || name.includes("hardwax oil");
  });
}

export function toWorkingSectionAssignment(
  sectionId: string,
): WorkingSectionAssignment {
  return {
    working_section_id: sectionId,
    assigned_worker_id: null,
  };
}
