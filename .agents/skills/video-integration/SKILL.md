---
name: video-integration
description: Integrate original cinematic video, animated WebP and transitions into the local game.
---

# video-integration

## Workflow

Inspect media metadata and existing playback code. Preserve original bytes unless user explicitly approves transcoding. Keep assets local and respect Git LFS configuration. Use explicit playback lifecycle, handle play rejection, ended/error events, skip and timeout recovery. Prevent black flashes, stale frames and audio overlap; preserve aspect ratio. For transparent effects use supported alpha media or carefully matched compositing; do not promise alpha in ordinary MP4. Verify offline playback and actual media availability rather than LFS pointers. Test mobile autoplay restrictions and report untested devices.

## Project constraints

Work in the existing index.html, code/ and media/ structure. Keep the game local and offline; no server, public hosting or online mode. Do not change unrelated mechanics or replace approved assets without explicit approval. Use a scoped diff and document tests and limitations. Coordinate with game-audit after implementation.
