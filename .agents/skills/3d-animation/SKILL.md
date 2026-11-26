---
name: 3d-animation
description: Implement and refine 3D coin tosses, card flips and spatial animations.
---

# 3d-animation

## Workflow

Inspect existing transforms and animation lifecycle. Preserve original coin faces and card art. Use perspective and preserve-3d with correct face orientation, thickness and backface visibility; avoid flattening ancestors. Keep coin randomness independent of visual animation and preserve the 50/50 result. Ensure final pose matches outcome. Test both outcomes, animation cancellation, reduced motion, resize and repeated runs. Avoid new network dependencies.

## Project constraints

Work in the existing index.html, code/ and media/ structure. Keep the game local and offline; no server, public hosting or online mode. Do not change unrelated mechanics or replace approved assets without explicit approval. Use a scoped diff and document tests and limitations. Coordinate with game-audit after implementation.
