/**
 * PreToolUse hook: blocks overly broad Glob/Grep patterns that waste tokens.
 * Forces narrower, more targeted searches.
 */
import { readFileSync } from 'fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const toolName = input?.tool_name || '';
const toolInput = input?.tool_input || {};

// Only check Glob and Grep
if (toolName !== 'Glob' && toolName !== 'Grep') {
  process.stdout.write(JSON.stringify({ continue: true }));
  process.exit(0);
}

const BLOCKED_PATTERNS = [
  /^\*\*\/\*$/,           // **/* (everything)
  /^\*\*\/\*\.\*$/,       // **/*.* (all files with extension)
  /^\*$/,                  // * (current dir everything)
];

const pattern = toolInput.pattern || '';
const isBlocked = BLOCKED_PATTERNS.some(regex => regex.test(pattern));

if (isBlocked) {
  process.stdout.write(JSON.stringify({
    continue: false,
    message: `Blocked overly broad pattern "${pattern}". Use a specific pattern (e.g., "**/*.ts", "src/**/*.cs") or check .claude/index/ registries first.`
  }));
} else {
  process.stdout.write(JSON.stringify({ continue: true }));
}
