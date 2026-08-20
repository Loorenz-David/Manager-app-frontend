import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * The package's outward boundaries, enforced rather than reviewed (phase-2 plan
 * task 11a, criteria 22 and 55's third clause; master plan §9.5).
 *
 * The price-editor seam has its own walk in `components/price-editor/`; this one
 * is about which *packages* may appear on either side of the new
 * `item-economics → items` edge.
 */

const PACKAGE_SRC = dirname(fileURLToPath(import.meta.url));
const PACKAGES_ROOT = resolve(PACKAGE_SRC, "..", "..");
const REPO_ROOT = resolve(PACKAGES_ROOT, "..");

const SOURCE_EXTENSIONS = [".ts", ".tsx"] as const;

function collectSourceFiles(directory: string): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) {
      continue;
    }

    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      found.push(...collectSourceFiles(path));
      continue;
    }

    if (SOURCE_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) {
      found.push(path);
    }
  }

  return found;
}

function collectImportSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  const importPattern =
    /(?:import|export)[^"']*?from\s+["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s+["']([^"']+)["']/g;

  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1] ?? match[2] ?? match[3];
    if (specifier) specifiers.push(specifier);
  }

  return specifiers;
}

function importsOf(files: string[]): { file: string; specifier: string }[] {
  return files.flatMap((file) =>
    collectImportSpecifiers(readFileSync(file, "utf8")).map((specifier) => ({
      file,
      specifier,
    })),
  );
}

describe("@beyo/item-economics package boundaries", () => {
  it("11a. imports neither @beyo/tasks nor @beyo/task-creation", () => {
    const files = collectSourceFiles(PACKAGE_SRC);
    expect(files.length).toBeGreaterThan(0);

    const violations = importsOf(files)
      .filter(
        ({ specifier }) =>
          specifier === "@beyo/tasks" ||
          specifier === "@beyo/task-creation" ||
          specifier.startsWith("@beyo/tasks/") ||
          specifier.startsWith("@beyo/task-creation/"),
      )
      .map(({ file, specifier }) => `${file} → ${specifier}`);

    expect(violations).toEqual([]);
  });

  it("22. the items edge stays forward-only — @beyo/items never imports back", () => {
    const itemsSrc = join(PACKAGES_ROOT, "items", "src");
    const files = collectSourceFiles(itemsSrc);
    expect(files.length).toBeGreaterThan(0);

    const violations = importsOf(files)
      .filter(({ specifier }) => specifier.startsWith("@beyo/item-economics"))
      .map(({ file, specifier }) => `${file} → ${specifier}`);

    expect(violations).toEqual([]);
  });
});

/**
 * Task 11 / master plan §11: the inline-pricing refusal the item_pricing_fields
 * phase was built around was retired by the backend (price-scenario handoff
 * §7.3). The sweep already ran there; this keeps it swept, so nobody codes
 * against an error that can no longer occur.
 */
describe("the retired inline-pricing refusal identity", () => {
  const RETIRED_IDENTITY = "ITEM_COST_INLINE_PRICE_ON_PRICED_ITEM";

  it("has zero references anywhere in packages/ or apps/", () => {
    const roots = [PACKAGES_ROOT, join(REPO_ROOT, "apps")];
    const files = roots.flatMap((root) => collectSourceFiles(root));
    expect(files.length).toBeGreaterThan(0);

    const hits = files.filter(
      (file) =>
        // This file names the identity in order to look for it.
        file !== fileURLToPath(import.meta.url) &&
        readFileSync(file, "utf8").includes(RETIRED_IDENTITY),
    );

    expect(hits).toEqual([]);
  });
});
