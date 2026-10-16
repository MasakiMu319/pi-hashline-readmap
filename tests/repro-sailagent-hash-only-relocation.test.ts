import { beforeAll, describe, expect, it } from "vitest";
import {
	applyHashlineEdits,
	computeLineHash,
	ensureHashInit,
	HashlineMismatchError,
} from "../src/hashline.js";

/**
 * Regression for a real SailAgent session from 2026-08-01.
 *
 * A read returned `873:242|.run-state {` and `885:b18|}`. The next edit
 * accidentally combined those into the never-observed hash-only anchor
 * `885:242`. Auto-relocation moved it to line 873 and inserted a CSS block
 * inside `.run-state {`, breaking the rule. A mismatched hash-only anchor has
 * no content identity and must be rejected instead of guessed.
 */
describe("SailAgent wrong-target hash-only relocation regression", () => {
	beforeAll(async () => {
		await ensureHashInit();
	});

	it("rejects the real mismatched 885:242 anchor instead of relocating it to line 873", () => {
		const lines = Array.from({ length: 900 }, (_, index) => `/* unaffected line ${index + 1} */`);
		lines[872] = ".run-state {";
		lines[873] = "  width: fit-content;";
		lines[874] = "  gap: 0.4375rem;";
		lines[875] = "  margin: 0.75rem 0 0;";
		lines[876] = "  color: var(--text-secondary);";
		lines[877] = "  font-size: 0.75rem;";
		lines[878] = "  font-weight: 500;";
		lines[879] = "}";
		lines[880] = "";
		lines[881] = ".run-state svg {";
		lines[882] = "  width: 0.8125rem;";
		lines[883] = "  height: 0.8125rem;";
		lines[884] = "}";

		const runStateHash = computeLineHash(873, lines[872]);
		expect(runStateHash).toBe("40b");
		expect(computeLineHash(885, lines[884])).toBe("b18");

		expect(() =>
			applyHashlineEdits(lines.join("\n"), [
				{
					insert_after: {
						anchor: `885:${runStateHash}`,
						new_text: ".run-model {\n  display: flex;\n}",
					},
				},
			]),
		).toThrow(HashlineMismatchError);
	});
});
