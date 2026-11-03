import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const packageLock = JSON.parse(readFileSync("package-lock.json", "utf8"));

describe("package version", () => {
  it("identifies the MasakiMu319 safety fork revision with a numeric release", () => {
    expect(packageJson.version).toBe("0.20.1");
    expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(packageLock.version).toBe("0.20.1");
    expect(packageLock.packages[""].version).toBe("0.20.1");
  });
});
