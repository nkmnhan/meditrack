/**
 * PostToolUse hook (fires after compaction completes): re-injects critical
 * session state that may have been lost during context compression.
 * Reads the marker file saved by pre-compact-save.mjs.
 */
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

const markerPath = join(process.cwd(), '.claude', '.compact-marker.json');

// Only fire if a compact marker exists
if (!existsSync(markerPath)) {
  process.stdout.write(JSON.stringify({ continue: true }));
  process.exit(0);
}

try {
  const marker = JSON.parse(readFileSync(markerPath, 'utf8'));
  const modifiedList = marker.modifiedFiles.length > 0
    ? `Modified files: ${marker.modifiedFiles.join(', ')}`
    : 'No uncommitted changes';
  const stagedList = marker.stagedFiles.length > 0
    ? `Staged files: ${marker.stagedFiles.join(', ')}`
    : '';

  const recovery = [
    `Session recovered after compaction.`,
    `Branch: ${marker.branch}`,
    modifiedList,
    stagedList,
    `Marker from: ${marker.timestamp}`,
    `Re-read CLAUDE.md and .claude/shared-memory/index.json if needed.`
  ].filter(Boolean).join('\n');

  // Remove marker after recovery
  unlinkSync(markerPath);

  process.stdout.write(JSON.stringify({
    continue: true,
    message: recovery
  }));
} catch (error) {
  process.stdout.write(JSON.stringify({ continue: true }));
}
