import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * The SRP seam, enforced (criterion 54; master plan §9.4, projection L17/L18):
 * nothing under components/price-editor/ — fixtures included — may import from
 * src/lib/ or src/types.ts. Every value the components show arrives
 * pre-formatted through props; the machinery stays on the other side.
 */

const PRICE_EDITOR_DIR = dirname(fileURLToPath(import.meta.url));

const FORBIDDEN_SPECIFIER_PATTERNS = [
  /\/lib\//, // ../../lib/price-scenario-math etc.
  /\/types$/, // ../../types
  /price-scenario/,
] as const;

function collectImportSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  const importPattern = /(?:import|export)[^"']*?from\s+["']([^"']+)["']|import\s+["']([^"']+)["']/g;
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1] ?? match[2];
    if (specifier) specifiers.push(specifier);
  }
  return specifiers;
}

describe("price-editor import boundary", () => {
  it("no source in this directory imports from src/lib/ or src/types.ts", () => {
    const files = readdirSync(PRICE_EDITOR_DIR).filter(
      (name) => name.endsWith(".ts") || name.endsWith(".tsx"),
    );
    expect(files.length).toBeGreaterThan(0);

    const violations: string[] = [];
    for (const file of files) {
      const source = readFileSync(join(PRICE_EDITOR_DIR, file), "utf8");
      for (const specifier of collectImportSpecifiers(source)) {
        // Only relative imports can reach the package's lib/types; package
        // imports like "@beyo/lib" are a different module entirely.
        const isRelative = specifier.startsWith(".");
        const isForbidden =
          isRelative &&
          FORBIDDEN_SPECIFIER_PATTERNS.some((pattern) =>
            pattern.test(specifier),
          );
        if (isForbidden) {
          violations.push(`${file} → ${specifier}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
