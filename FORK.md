# MasakiMu319 Maintenance Fork

This fork tracks `coctostan/pi-hashline-readmap` and carries a safety-first anchored-edit policy.

## Safety delta

- A bare `LINE:HASH` validates only the hinted line. If that line changed, the edit fails closed.
- A complete `LINE:HASH|content` anchor may relocate only to one nearby line whose content matches exactly.
- Anchored-line fuzzy similarity, nearby hash matches, duplicate exact candidates, and inconsistent hash/content pairs fail closed.
- Session-level shifted-anchor remapping (`ServedLines` / `remapShiftedAnchors`) and RTK behavior are inherited from upstream `0.16.1`.

## Sync upstream

```bash
git fetch upstream
git checkout main
git merge --ff-only upstream/main
npm install
npm test
npm run typecheck
```

Resolve behavior changes deliberately rather than accepting upstream relocation logic automatically. The real regression source is documented in [`docs/real-session-hash-only-relocation.md`](docs/real-session-hash-only-relocation.md).

## Validate

```bash
npm test
npm run typecheck
npm pack --dry-run
```

The package version uses the `0.16.1-masaki.N` suffix for local fork revisions. Changes are not published or pushed automatically.
