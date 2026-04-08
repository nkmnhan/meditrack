#!/usr/bin/env bash
#
# PostToolUse hook: auto-lint after Write/Edit on frontend files.
# Ported from .claude/hooks/post-edit-lint.mjs
#
# Catches lint errors immediately so the Copilot agent can fix them in the
# same agentic loop — mirrors the behaviour of the Claude Code hook exactly.

FILE_PATH="${TOOL_INPUT_FILE_PATH:-}"

# Only lint frontend TypeScript/React files (same regex as Claude hook)
if [[ ! "$FILE_PATH" =~ MediTrack\.Web/src/.*\.(ts|tsx)$ ]]; then
  exit 0
fi

# Run ESLint from the web project root (same CWD as Claude hook)
OUTPUT=$(cd src/MediTrack.Web && npx eslint --no-warn-ignored --max-warnings 0 "$FILE_PATH" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  # Print filename only + truncated output (mirrors Claude hook's message format)
  FILENAME=$(basename "$FILE_PATH")
  echo "Lint errors in $FILENAME:"
  echo "${OUTPUT:0:500}"
fi

# Always exit 0 so the agent continues — errors are shown as feedback, not blockers.
# This is intentional: same as Claude hook's { continue: true, message: "..." } pattern.
exit 0
