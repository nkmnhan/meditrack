/**
 * SessionStart hook: fires on session start, resume, clear, and after compact.
 * - Loads shared-memory summary for context
 * - Recovers state after compaction (replaces post-compact-recovery on PostToolUse)
 */
import { readFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';

const messages = [];

// 1. Load shared-memory summary
const indexPath = join(process.cwd(), '.claude', 'shared-memory', 'index.json');
try {
  if (existsSync(indexPath)) {
    const index = JSON.parse(readFileSync(indexPath, 'utf8'));
    const categories = ['learnings', 'principles', 'fixes', 'patterns', 'decisions', 'gotchas'];
    const counts = categories
      .filter(cat => Array.isArray(index[cat]) && index[cat].length > 0)
      .map(cat => `${cat}: ${index[cat].length}`);

    if (counts.length > 0) {
      messages.push(`Shared memory loaded: ${counts.join(', ')}. Use /learn search to query.`);
    }
  }
} catch { /* ignore */ }

// 2. Recover from compaction (if marker exists)
const markerPath = join(process.cwd(), '.claude', '.compact-marker.json');
try {
  if (existsSync(markerPath)) {
    const marker = JSON.parse(readFileSync(markerPath, 'utf8'));
    const modifiedList = marker.modifiedFiles?.length > 0
      ? `Modified: ${marker.modifiedFiles.join(', ')}`
      : 'No uncommitted changes';
    const stagedList = marker.stagedFiles?.length > 0
      ? `Staged: ${marker.stagedFiles.join(', ')}`
      : '';

    messages.push([
      `Session recovered after compaction.`,
      `Branch: ${marker.branch}`,
      modifiedList,
      stagedList,
      `Marker from: ${marker.timestamp}`
    ].filter(Boolean).join('\n'));

    unlinkSync(markerPath);
  }
} catch { /* ignore */ }

process.stdout.write(JSON.stringify({
  continue: true,
  message: messages.length > 0 ? messages.join('\n\n') : undefined
}));
