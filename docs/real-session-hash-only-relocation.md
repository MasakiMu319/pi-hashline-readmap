# Real-session hash-only wrong relocation

This fork's fail-closed policy responds to a real Pi coding session, not a generated collision benchmark.

## Incident

On 2026-08-01, a SailAgent session read CSS containing:

```text
873:242|.run-state {
...
885:b18|}
```

The next edit accidentally combined the line number from the closing brace with the hash from `.run-state {`:

```json
{
  "insert_after": {
    "anchor": "885:242",
    "new_text": ".run-model { ... }"
  }
}
```

The upstream edit engine accepted the invalid hash-only pair and reported:

```text
Auto-relocated anchor 885:242 -> 873:242 (window ±20).
```

It then inserted `.run-model` directly after `.run-state {`, splitting the CSS rule. The next file inspection showed:

```css
.run-state {

.run-model {
```

The agent explicitly diagnosed that the insertion had landed inside `.run-state` and repaired the affected region.

## Regression contract

`tests/repro-sailagent-hash-only-relocation.test.ts` preserves the observed line numbers, contents, hashes (`242` under pre-0.15 whitespace-stripped hashing; `40b` under 0.15+ whitespace-preserving hashing), and edit shape. It requires the invalid `885:<run-state-hash>` anchor to throw `HashlineMismatchError` rather than mutate content.

This incident proves that wrong-target relocation can occur and cause real file damage. It does not establish a production failure rate.
