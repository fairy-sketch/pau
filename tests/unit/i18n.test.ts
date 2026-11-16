import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_NAME } from "@/src/config/app";
import { formatDate, formatMoney, formatTime } from "@/src/domain/format";
import messages from "@/src/i18n/messages/en.json";

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(path);
  }
  return out;
}

const files = [...sourceFiles("app"), ...sourceFiles("src")];

function leaves(node: unknown, path = ""): Array<[string, unknown]> {
  if (node !== null && typeof node === "object") {
    return Object.entries(node).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  }
  return [[path, node]];
}

describe("i18n", () => {
  // ESLint (react/jsx-no-literals) covers JSX text. This covers the attributes
  // that carry human-readable text, which that rule skips.
  it("has no hardcoded text in human-readable JSX attributes", () => {
    const attribute =
      /\b(aria-label|aria-description|aria-placeholder|aria-valuetext|alt|title|placeholder|label)=(["'])[^"']*[A-Za-z][^"']*\2/;
    const offenders = files
      .filter((file) => file.endsWith(".tsx"))
      .flatMap((file) =>
        readFileSync(file, "utf8")
          .split("\n")
          .map((line, i) => (attribute.test(line) ? `${file}:${i + 1}: ${line.trim()}` : null))
          .filter((x): x is string => x !== null),
      );
    expect(offenders).toEqual([]);
  });

  it("writes the product name in exactly one place", () => {
    const literal = new RegExp(`(["'\`>])${APP_NAME}\\b`);
    const offenders = files
      .filter((file) => file !== join("src", "config", "app.ts"))
      .filter((file) => literal.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
    expect(JSON.stringify(messages)).not.toContain(APP_NAME);
  });

  it("has a non-empty string for every message", () => {
    const bad = leaves(messages).filter(([, v]) => typeof v !== "string" || v.trim() === "");
    expect(bad).toEqual([]);
  });

  it("avoids jargon the brief bans from the UI", () => {
    const jargon = leaves(messages).filter(([, v]) => /entitlement/i.test(String(v)));
    expect(jargon).toEqual([]);
  });
});

describe("formatting (en-CH, CHF, Europe/Zurich)", () => {
  it("formats money in CHF", () => {
    const text = formatMoney(1250);
    expect(text).toContain("CHF");
    expect(text.replace(/[^\d.]/g, "")).toBe("1250.00");
  });

  it("formats club wall-clock time across the DST change", () => {
    // 18:30 in Zurich is 17:30 UTC in winter and 16:30 UTC in summer.
    expect(formatTime(new Date("2026-11-19T17:30:00Z"))).toBe("18:30");
    expect(formatTime(new Date("2026-06-18T16:30:00Z"))).toBe("18:30");
  });

  it("formats dates day-first", () => {
    expect(formatDate(new Date("2027-05-09T10:00:00Z"))).toBe("9 May 2027");
  });
});
