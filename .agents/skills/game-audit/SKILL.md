---
name: game-audit
description: Audit gameplay correctness, offline behavior, performance and regressions.
---

# game-audit

## Workflow

Inspect repository and README; establish baseline and scope. Test intro, hall, grimoire, two-card draft, five players per captain, Chronos rollback and final-card event, cinematic, both coin outcomes, 18 Deadlock moves (6 bans, 12 picks), undo where supported and PNG export. Check duplicate picks, invalid transitions, rapid taps, cancellation and errors. Run syntax checks and browser tests with network disabled and real assets when available. Profile hidden animations, RAF, memory and DOM churn. Record exact test commands, results, failures and untested devices; never equate placeholder fixtures with full-media testing. Preserve media hashes and report changes.

## Project constraints

Work in the existing index.html, code/ and media/ structure. Keep the game local and offline; no server, public hosting or online mode. Do not change unrelated mechanics or replace approved assets without explicit approval. Use a scoped diff and document tests and limitations. Coordinate with game-audit after implementation.
