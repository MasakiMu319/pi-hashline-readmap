import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, it } from "vitest";
import { selectCompatHost } from "../scripts/pi-compat-host.mjs";

const { host } = selectCompatHost();
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

// Pi's update notice runs this parser on a package's root CHANGELOG.md (getExtensionChangelogUpdates).
it("lets the selected host's changelog parser find the entry for package.json's version", async () => {
  const { parseChangelog } = await import(pathToFileURL(join(host, "dist/utils/changelog.js")).href);
  const versions = parseChangelog("CHANGELOG.md").map((entry: { major: number; minor: number; patch: number }) =>
    `${entry.major}.${entry.minor}.${entry.patch}`);
  expect(versions).toContain(packageJson.version);
});

it("shows the current fork release once with the selected host's unchanged parser", async () => {
  const { getNewEntries, parseChangelog } = await import(pathToFileURL(join(host, "dist/utils/changelog.js")).href);
  const entries = parseChangelog("CHANGELOG.md");
  const currentRelease = entries.find(
    (entry: { major: number; minor: number; patch: number }) =>
      `${entry.major}.${entry.minor}.${entry.patch}` === packageJson.version,
  );

  expect(currentRelease).toBeDefined();
  expect(getNewEntries(entries, packageJson.version)).toEqual([]);
  for (const previousVersion of ["0.16.1-masaki.1", "0.16.1", "0.16.2", "0.20.0"]) {
    expect(getNewEntries(entries, previousVersion)).toContainEqual(currentRelease);
  }
});
