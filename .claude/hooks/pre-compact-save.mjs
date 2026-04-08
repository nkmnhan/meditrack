/**
 * PreCompact hook: saves critical session state before context compaction.
 * State is written to a marker file that post-compact-recovery reads.
 */
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const markerPath = join(process.cwd(), '.claude', '.compact-marker.json');

try {
  const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  const modified = execSync('git diff --name-only', { encoding: 'utf8' }).trim();
  const staged = execSync('git diff --staged --name-only', { encoding: 'utf8' }).trim();

  const marker = {
    timestamp: new Date().toISOString(),
    branch,
    modifiedFiles: modified ? modified.split('\n') : [],
    stagedFiles: staged ? staged.split('\n') : [],
  };

  writeFileSync(markerPath, JSON.stringify(marker, null, 2));

  process.stdout.write(JSON.stringify({
    continue: true,
    message: `Compact marker saved: branch=${branch}, ${marker.modifiedFiles.length} modified, ${marker.stagedFiles.length} staged`
  }));
} catch (error) {
  // Don't block compaction if marker save fails
  process.stdout.write(JSON.stringify({ continue: true }));
}
