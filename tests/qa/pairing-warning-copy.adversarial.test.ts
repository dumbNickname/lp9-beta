import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// QA adversarial / consistency suite for PRD-23 (honest recovery copy).
// These are SOURCE-SCAN tests: they read the production source files and
// assert on their content. They complement the render tests in
// pairing-warning-surface.adversarial.test.tsx.
//
// The core risk for a copy PRD is DISHONEST or inconsistent phrasing.
// DESIGN.md §3 forbids telling users their data is "only on your device"
// (untrue: data is on Supabase). We enforce that no user-facing string in
// src/ carries that claim or a close variant.

const SRC = join(process.cwd(), "src");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(tsx?|css)$/.test(name)) out.push(p);
  }
  return out;
}

// Strip // line comments and /* */ block comments so we scan only what
// actually ships as user-facing copy, not the docstrings that legitimately
// quote the forbidden phrase to explain the ban. This is deliberately
// simple (not a full JS parser) but sufficient for this codebase's style.
function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const FILES = walk(SRC);

// Forbidden data-loss claim + close variants (DESIGN.md §3, line 44).
const FORBIDDEN = [
  "only on your device",
  "only on this device",
  "just on your device",
  "data is only on",
  "stored only on your",
  "lives only on your device", // singular device (would be a §3 violation)
];

describe("PRD-23 forbidden-phrasing scan (src/, case-insensitive)", () => {
  it("finds every scannable source file", () => {
    // Guard against a broken walk silently passing the scan.
    expect(FILES.length).toBeGreaterThan(10);
    expect(FILES.some((f) => f.endsWith("RecoveryWarning.tsx"))).toBe(true);
    expect(FILES.some((f) => f.endsWith("Onboarding.tsx"))).toBe(true);
  });

  for (const phrase of FORBIDDEN) {
    it(`no user-facing copy claims "${phrase}"`, () => {
      const offenders: string[] = [];
      for (const file of FILES) {
        const shipped = stripComments(readFileSync(file, "utf8")).toLowerCase();
        if (shipped.includes(phrase)) {
          offenders.push(file.replace(process.cwd(), "."));
        }
      }
      expect(offenders, `forbidden phrase in: ${offenders.join(", ")}`).toEqual(
        [],
      );
    });
  }

  it("the only 'only on your device' occurrence in RecoveryWarning is a code comment, not shipped copy", () => {
    // Sanity check on the strip logic: the docstring quotes the phrase, but
    // it must NOT survive comment-stripping (i.e. it isn't in shipped copy).
    const file = join(SRC, "components", "RecoveryWarning.tsx");
    const raw = readFileSync(file, "utf8").toLowerCase();
    const shipped = stripComments(readFileSync(file, "utf8")).toLowerCase();
    expect(raw).toContain("only on your device"); // present in the comment
    expect(shipped).not.toContain("only on your device"); // absent from copy
  });

  it("RecoveryWarning's device claim is about the KEY on paired devices (plural), not data on one device", () => {
    const shipped = stripComments(
      readFileSync(join(SRC, "components", "RecoveryWarning.tsx"), "utf8"),
    ).toLowerCase();
    // The honest §12b statement: the key lives only on paired devices.
    expect(shipped).toContain("only on your paired devices");
  });
});

describe("PRD-23 .callout CSS: semantic tokens + logical properties only", () => {
  const css = readFileSync(join(SRC, "styles", "global.css"), "utf8");

  // Extract just the .callout* rule blocks so we don't judge unrelated CSS.
  function calloutBlocks(): string {
    const blocks: string[] = [];
    const re = /\.callout[^{]*\{([^}]*)\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(css)) !== null) blocks.push(m[0]);
    return blocks.join("\n");
  }

  const blocks = calloutBlocks();

  it("has .callout rule blocks to inspect", () => {
    expect(blocks).toContain(".callout {");
    expect(blocks).toContain(".callout--warning");
  });

  it("colors come from semantic tokens, never raw hex/rgb/hsl hues", () => {
    // color / background-color declarations must reference var(--color-...).
    const colorDecls =
      blocks.match(/(?:^|\s)(?:background-)?color\s*:\s*[^;]+;/g) ?? [];
    expect(colorDecls.length).toBeGreaterThan(0);
    for (const decl of colorDecls) {
      expect(decl).toMatch(/var\(--color-/);
    }
    // No raw color literals anywhere in the callout blocks.
    expect(blocks).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(blocks).not.toMatch(/\brgba?\(/);
    expect(blocks).not.toMatch(/\bhsla?\(/);
  });

  it("uses logical CSS properties only (no physical margin/padding/inset)", () => {
    const physical = [
      /margin-(left|right|top|bottom)\s*:/,
      /padding-(left|right|top|bottom)\s*:/,
      /border-(left|right|top|bottom)\s*:/,
      /\b(left|right|top|bottom)\s*:/, // physical inset (not inset-inline/block)
      /text-align\s*:\s*(left|right)\b/,
    ];
    for (const re of physical) {
      expect(blocks, `physical property matched ${re}`).not.toMatch(re);
    }
    // Positively confirm the logical equivalents are what's used.
    expect(blocks).toMatch(/padding-inline|padding-block/);
    expect(blocks).toMatch(/margin-block/);
    expect(blocks).toMatch(/border-inline-start/);
  });
});

describe("PRD-23 Callout is a non-focus-stealing note (source)", () => {
  const tsx = readFileSync(
    join(SRC, "components", "Callout.tsx"),
    "utf8",
  );

  it('renders role="note", not role="alert"', () => {
    expect(tsx).toContain('role="note"');
    expect(tsx).not.toContain('role="alert"');
  });

  it("does not autofocus or otherwise grab focus", () => {
    expect(tsx.toLowerCase()).not.toContain("autofocus");
    expect(tsx).not.toContain(".focus(");
    expect(tsx).not.toContain("tabindex");
  });
});
