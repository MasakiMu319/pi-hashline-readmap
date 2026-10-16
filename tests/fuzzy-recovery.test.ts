import { describe, it, expect, beforeAll } from "vitest";
import { ensureHashInit, computeLineHash, applyHashlineEdits } from "../src/hashline.js";

describe("no content-similarity recovery for stale anchors", () => {
  beforeAll(async () => {
    await ensureHashInit();
  });

  it("refuses a stale anchor even when the changed line is very similar", () => {
    // File with a line that was slightly modified (trailing comma added)
    const originalLine = "const result = processData(input, options, config)";
    const modifiedLine = "const result = processData(input, options, config),";
    // High similarity — same tokens except trailing comma

    const lines = [
      "line 1",
      "line 2",
      originalLine, // line 3
      "line 4",
      "line 5",
    ];

    // Compute hash for original line 3
    const hash3 = computeLineHash(3, originalLine);

    // Modify the file — line 3 now has modified content
    const modifiedLines = [...lines];
    modifiedLines[2] = modifiedLine;
    const modifiedContent = modifiedLines.join("\n");

    // A changed line is stale. Editing a "similar" line instead would silently overwrite a
    // change the model has not seen, so the edit is refused with fresh anchors.
    expect(() =>
      applyHashlineEdits(modifiedContent, [
        { set_line: { anchor: `3:${hash3}|${originalLine}`, new_text: "edited line" } },
      ]),
    ).toThrow(/changed since last read/);
  });

  it("throws standard error when two candidates exceed 0.8 similarity", () => {
    // Two very similar lines — fuzzy recovery should refuse (ambiguous)
    const targetLine = "const value = compute(alpha, beta, gamma)";
    const similarLine1 = "const value = compute(alpha, beta, delta)";
    const similarLine2 = "const value = compute(alpha, beta, epsilon)";

    const lines = [
      "line 1",
      targetLine, // line 2
      "line 3",
      similarLine1, // line 4 — similar
      similarLine2, // line 5 — also similar
    ];
    const hash2 = computeLineHash(2, targetLine);

    // Modify file — remove original from line 2, similar lines remain at 4 and 5
    const modifiedLines = [...lines];
    modifiedLines[1] = "completely different content here";
    const modifiedContent = modifiedLines.join("\n");

    expect(() =>
      applyHashlineEdits(modifiedContent, [
        { set_line: { anchor: `2:${hash2}|${targetLine}`, new_text: "edited" } },
      ])
    ).toThrow(/changed since last read/);
  });

  it("throws standard error when similarity is below 0.8", () => {
    const originalLine = "function processData(input) { return transform(input); }";
    const lowSimilarityLine = "class DataProcessor { constructor() {} }";

    const lines = [
      "line 1",
      originalLine, // line 2
      "line 3",
    ];
    const hash2 = computeLineHash(2, originalLine);

    const modifiedLines = [...lines];
    modifiedLines[1] = lowSimilarityLine;
    const modifiedContent = modifiedLines.join("\n");

    expect(() =>
      applyHashlineEdits(modifiedContent, [
        { set_line: { anchor: `2:${hash2}|${originalLine}`, new_text: "edited" } },
      ])
    ).toThrow(/changed since last read/);
  });

  it("refuses a stale anchor whose line gained a token", () => {
    const originalLine = "export const myData = await loadConfig(alpha, beta, gamma, delta, epsilon)";
    const modifiedLine = "export const myData = await loadConfig(alpha, beta, gamma, delta, epsilon, zeta)";

    const hash2 = computeLineHash(2, originalLine);

    const modifiedLines = ["line 1", modifiedLine, "line 3"];
    const modifiedContent = modifiedLines.join("\n");

    expect(() =>
      applyHashlineEdits(modifiedContent, [
        { set_line: { anchor: `2:${hash2}|${originalLine}`, new_text: "edited" } },
      ]),
    ).toThrow(/Did you mean one of these nearby lines\?[\s\S]*zeta/);
  });

  it("falls through to standard error when anchor has no content after pipe", () => {
    const originalLine = "const x = 42;";
    const hash2 = computeLineHash(2, originalLine);

    const modifiedLines = ["line 1", "const y = 99;", "line 3"];
    const modifiedContent = modifiedLines.join("\n");

    // Anchor WITHOUT content after pipe — no fuzzy recovery possible
    expect(() =>
      applyHashlineEdits(modifiedContent, [
        { set_line: { anchor: `2:${hash2}`, new_text: "edited" } },
      ])
    ).toThrow(/changed since last read/);
  });

  it("relocates a unique complete anchor when the line moves", () => {
    const originalLine = "const result = processData(input, options, config)";
    const content = ["line 1", "inserted line", originalLine, "line 4"].join("\n");
    const hash = computeLineHash(2, originalLine);

    const result = applyHashlineEdits(content, [
      { set_line: { anchor: `2:${hash}|${originalLine}`, new_text: "edited line" } },
    ]);

    expect(result.content).toContain("edited line");
    expect(result.warnings).toContain(
      `Exact-content-relocated anchor 2:${hash} -> 3:${hash} (window ±20).`,
    );
  });

  it("rejects ambiguous duplicate exact content", () => {
    const originalLine = "const target = value;";
    const hash = computeLineHash(2, originalLine);
    const content = ["line 1", "changed", originalLine, "line 4", originalLine].join("\n");

    expect(() =>
      applyHashlineEdits(content, [
        { set_line: { anchor: `2:${hash}|${originalLine}`, new_text: "edited" } },
      ]),
    ).toThrow(/changed since last read/);
  });

  it("rejects a self-inconsistent hash and content pair", () => {
    const content = ["line 1", "line 2", "target"].join("\n");
    const wrongHash = computeLineHash(1, "different target");

    expect(() =>
      applyHashlineEdits(content, [
        { set_line: { anchor: `1:${wrongHash}|target`, new_text: "edited" } },
      ]),
    ).toThrow(/changed since last read/);
  });

  it("requires content identity for a moved hash-only anchor", () => {
    const originalLine = "line B";
    const hash = computeLineHash(2, originalLine);
    const content = ["line A", "inserted", originalLine, "line C"].join("\n");

    expect(() =>
      applyHashlineEdits(content, [
        { set_line: { anchor: `2:${hash}`, new_text: "edited" } },
      ]),
    ).toThrow(/changed since last read/);
  });

  it("relocates a complete anchor whose hinted line is beyond the shortened file", () => {
    const originalLine = "final target";
    const hash = computeLineHash(5, originalLine);
    const content = ["line 1", "line 2", originalLine].join("\n");

    const result = applyHashlineEdits(content, [
      { set_line: { anchor: `5:${hash}|${originalLine}`, new_text: "edited" } },
    ]);

    expect(result.content).toBe(["line 1", "line 2", "edited"].join("\n"));
    expect(result.warnings).toContain(
      `Exact-content-relocated anchor 5:${hash} -> 3:${hash} (window ±20).`,
    );
  });
});
