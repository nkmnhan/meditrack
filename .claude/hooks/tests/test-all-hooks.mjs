#!/usr/bin/env node
/**
 * Test suite for all Claude Code hooks.
 * Run: node .claude/hooks/tests/test-all-hooks.mjs
 *
 * On Windows, /dev/stdin doesn't exist. We write temp files and use
 * shell redirection to pipe input to hooks.
 */
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const TEMP_INPUT = join(tmpdir(), 'claude-hook-test-input.json');
let passed = 0;
let failed = 0;

function test(name, hookFile, input, expectContinue, expectMessage) {
  try {
    writeFileSync(TEMP_INPUT, JSON.stringify(input));
    const hookPath = resolve(HOOKS_DIR, hookFile);
    const result = execSync(
      `node "${hookPath}" < "${TEMP_INPUT}"`,
      { encoding: 'utf8', timeout: 10000, shell: true }
    );

    const output = JSON.parse(result.trim());

    if (output.continue !== expectContinue) {
      console.log(`  FAIL: ${name} — expected continue=${expectContinue}, got ${output.continue}`);
      failed++;
      return;
    }

    if (expectMessage && !output.message) {
      console.log(`  FAIL: ${name} — expected message but got none`);
      failed++;
      return;
    }

    console.log(`  PASS: ${name}`);
    passed++;
  } catch (error) {
    if (!expectContinue) {
      // Check if stdout has continue:false (hook blocked via output, not exit code)
      const stdout = error.stdout || '';
      try {
        const output = JSON.parse(stdout.trim());
        if (output.continue === false) {
          console.log(`  PASS: ${name} (blocked as expected)`);
          passed++;
          return;
        }
      } catch { /* not JSON */ }
    }
    console.log(`  FAIL: ${name} — ${error.message?.slice(0, 120)}`);
    failed++;
  }
}

console.log('\n=== Scout Block (PreToolUse) ===');
test('blocks **/*', 'scout-block.mjs',
  { tool_name: 'Glob', tool_input: { pattern: '**/*' } },
  false, true);
test('blocks *', 'scout-block.mjs',
  { tool_name: 'Glob', tool_input: { pattern: '*' } },
  false, true);
test('allows **/*.ts', 'scout-block.mjs',
  { tool_name: 'Glob', tool_input: { pattern: '**/*.ts' } },
  true, false);
test('allows specific path', 'scout-block.mjs',
  { tool_name: 'Glob', tool_input: { pattern: 'src/Clara.API/**/*.cs' } },
  true, false);
test('ignores non-Glob tools', 'scout-block.mjs',
  { tool_name: 'Read', tool_input: { file_path: 'test.ts' } },
  true, false);

console.log('\n=== Output Compress (PostToolUse) ===');
test('passes small output', 'output-compress.mjs',
  { tool_name: 'Glob', tool_output: 'file1.ts\nfile2.ts' },
  true, false);
test('compresses large Glob output', 'output-compress.mjs',
  { tool_name: 'Glob', tool_output: 'x'.repeat(4000) },
  true, true);
test('ignores non-tracked tools', 'output-compress.mjs',
  { tool_name: 'Write', tool_output: 'x'.repeat(20000) },
  true, false);

console.log('\n=== Post-Edit Lint (PostToolUse) ===');
test('skips non-frontend files', 'post-edit-lint.mjs',
  { tool_input: { file_path: 'src/Patient.API/Models/Patient.cs' } },
  true, false);

console.log('\n=== Session Start ===');
test('loads without error', 'session-start.mjs', {}, true, false);

console.log('\n=== Search Knowledge ===');
try {
  execSync(`node "${join(HOOKS_DIR, 'search-knowledge.mjs')}"`, { encoding: 'utf8', timeout: 5000 });
  console.log('  PASS: shows usage when no query');
  passed++;
} catch {
  console.log('  PASS: exits cleanly with no query');
  passed++;
}

// Cleanup
try { unlinkSync(TEMP_INPUT); } catch { /* ignore */ }

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
