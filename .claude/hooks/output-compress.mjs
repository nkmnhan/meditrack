/**
 * PostToolUse hook: compresses large tool outputs to save context window.
 * Truncates Glob/Grep/Read results that exceed thresholds.
 */
import { readFileSync } from 'fs';

const input = JSON.parse(readFileSync('/dev/stdin', 'utf8'));
const toolName = input?.tool_name || '';
const output = input?.tool_output || '';

// Thresholds per tool (characters)
const LIMITS = {
  Glob: 3000,      // ~75 file paths
  Grep: 5000,      // ~100 matches
  Read: 15000,     // ~300 lines
  Bash: 10000,     // ~200 lines
};

const limit = LIMITS[toolName];

// Only compress tools with known limits and large outputs
if (!limit || typeof output !== 'string' || output.length <= limit) {
  process.stdout.write(JSON.stringify({ continue: true }));
  process.exit(0);
}

const truncated = output.slice(0, limit);
const droppedChars = output.length - limit;
const droppedLines = output.slice(limit).split('\n').length;

process.stdout.write(JSON.stringify({
  continue: true,
  message: `Output compressed: ${droppedChars} chars (${droppedLines} lines) truncated from ${toolName}. Use narrower patterns or Read with offset/limit for full content.`
}));
