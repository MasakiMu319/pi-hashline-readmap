# MasakiMu319 Maintenance Fork

This fork tracks `coctostan/pi-hashline-readmap` and carries a safety-first anchored-edit policy.

Current fork release: `0.20.1`. Upstream base: `0.20.0`, commit `31b44b1d8e07ad679374140e68ac146cdb89fec0` (2026-11-02).

## Safety delta

- A bare `LINE:HASH` validates only the hinted line. If that line changed, the edit fails closed.
- A complete `LINE:HASH|content` anchor may relocate only to one nearby line whose content matches exactly.
- Anchored-line fuzzy similarity, nearby hash matches, duplicate exact candidates, and inconsistent hash/content pairs fail closed.
- Session-level shifted-anchor remapping (`ServedLines` / `remapShiftedAnchors`), anchor freshness, and RTK behavior are inherited from upstream `0.20.0`.

## Sync upstream

```bash
git fetch upstream
git switch -c sync/upstream-<version> main
git merge --no-commit --no-ff upstream/main
# Resolve conflicts, preserve the safety delta, and bump the numeric fork version.
npm ci
npm test
npm run typecheck
npm run typecheck:pi-host
npm run build
git diff --check
# Review, commit the merge, then fast-forward main to the tested sync branch.
```

Resolve behavior changes deliberately rather than accepting upstream relocation logic automatically. The real regression source is documented in [`docs/real-session-hash-only-relocation.md`](docs/real-session-hash-only-relocation.md).

## Validate

```bash
npm test
npm run typecheck
npm run typecheck:pi-host
npm run build
npm pack --dry-run --ignore-scripts
```

## Versioning

Use plain `major.minor.patch` versions for fork releases (currently `0.20.1`). Keep `package.json`, both root versions in `package-lock.json`, and the release heading in `CHANGELOG.md` synchronized. Record the upstream base and fork identity in this document.

Pi 1.5.0 parses seen changelog versions by splitting on dots and converting each part to a number. A `-masaki.N` suffix or `+build` metadata makes the patch part invalid and repeats release notes on every startup. Every fork release must increase the current numeric version, including after an upstream sync.

Changes are not published or pushed automatically.
