/**
 * InstructionsLoaded hook: fires each time a CLAUDE.md or .claude/rules/*.md
 * file is loaded into context. Logs which files load, when, and why.
 *
 * NOTE: This event has NO decision control — exit code and JSON output are
 * ignored. The hook is purely for side-effect logging (audit/debugging).
 *
 * Input fields (per official docs):
 *   file_path     — absolute path to the loaded instruction file
 *   memory_type   — "User" | "Project" | "Local" | "Managed"
 *   load_reason   — "session_start" | "nested_traversal" | "path_glob_match" | "include" | "compact"
 *   globs         — (optional) path patterns from the file's paths: frontmatter
 *   trigger_file_path — (optional) file whose access triggered a lazy load
 *   parent_file_path  — (optional) parent file that @imported this one
 */
import { appendFileSync, mkdirSync } from 'fs';
import { join, relative } from 'path';

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const logDir = join(projectDir, '.claude', 'logs');
const logPath = join(logDir, 'instructions-loaded.log');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = input.trim() ? JSON.parse(input) : {};
    const filePath = data.file_path ?? '(unknown)';
    const relPath = relative(projectDir, filePath);
    const reason = data.load_reason ?? '(unknown)';
    const memoryType = data.memory_type ?? '';
    const timestamp = new Date().toISOString();

    const parts = [`[${timestamp}]`, reason.padEnd(18), memoryType.padEnd(8), relPath];
    if (data.globs) parts.push(`globs=${JSON.stringify(data.globs)}`);
    if (data.trigger_file_path) parts.push(`trigger=${relative(projectDir, data.trigger_file_path)}`);

    mkdirSync(logDir, { recursive: true });
    appendFileSync(logPath, parts.join('  ') + '\n');
  } catch {
    // Silently ignore — this hook must never block Claude
  }
});
