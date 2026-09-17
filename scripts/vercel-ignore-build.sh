#!/bin/sh
# Vercel "ignored build step": exit 0 to skip the build, 1 to build.
# A commit that touches only the Discord bot, its docs, or repository notes
# changes nothing the site serves, so it earns no build. Anything else builds.
prev="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -z "$prev" ] || ! git cat-file -e "$prev" 2>/dev/null; then exit 1; fi
changed="$(git diff --name-only "$prev" HEAD)"
[ -z "$changed" ] && exit 0
site="$(printf '%s\n' "$changed" | grep -vE '^(docs/|scripts/(discord-[^/]*|site-changes[^/]*|repo-updates[^/]*|owner-updates[^/]*|github-web[^/]*|install-discord-agent\.sh|configure-discord-agent\.mjs)$|AGENTS\.md$|CLAUDE\.md$|README\.md$|\.claude/)' || true)"
if [ -z "$site" ]; then echo "only bot code or notes changed; skipping build"; exit 0; fi
exit 1
