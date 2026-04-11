/**
 * PostToolUse hook: auto-lint after Write/Edit on frontend or backend files.
 * - TypeScript/React: ESLint with zero warnings
 * - C#: dotnet format --verify-no-changes on the owning project
 * Catches errors immediately so Claude can fix them in the same turn.
 */
import { readFileSync, existsSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const filePath = input?.tool_input?.file_path || input?.tool_input?.path || '';

// --- TypeScript / React ---
if (filePath.match(/MediTrack\.Web\/src\/.*\.(ts|tsx)$/)) {
  try {
    const webDir = resolve('src/MediTrack.Web');
    execSync(`npx eslint --no-warn-ignored --max-warnings 0 "${filePath}"`, {
      cwd: webDir,
      timeout: 15000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    process.stdout.write(JSON.stringify({ continue: true }));
  } catch (error) {
    const lintOutput = error.stdout?.toString() || error.stderr?.toString() || '';
    process.stdout.write(JSON.stringify({
      continue: true,
      message: `ESLint errors in ${filePath.split(/[\\/]/).pop()}:\n${lintOutput.slice(0, 500)}`
    }));
  }
  process.exit(0);
}

// --- C# ---
if (filePath.match(/\.cs$/)) {
  // Walk up from file to find the nearest .csproj
  const findProject = (startDir) => {
    let dir = startDir;
    for (let i = 0; i < 8; i++) {
      try {
        const hasCsproj = readdirSync(dir).some(f => f.endsWith('.csproj'));
        if (hasCsproj) return dir;
      } catch { /* unreadable dir, keep walking up */ }
      const parent = dirname(dir);
      if (parent === dir) return null;
      dir = parent;
    }
    return null;
  };

  const projectDir = findProject(dirname(filePath));

  if (!projectDir) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  try {
    execSync(`dotnet format "${projectDir}" --verify-no-changes --include "${filePath}"`, {
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    process.stdout.write(JSON.stringify({ continue: true }));
  } catch (error) {
    const output = error.stdout?.toString() || error.stderr?.toString() || '';
    process.stdout.write(JSON.stringify({
      continue: true,
      message: `dotnet format issues in ${filePath.split(/[\\/]/).pop()}:\n${output.slice(0, 500)}`
    }));
  }
  process.exit(0);
}

// Not a linted file type — continue
process.stdout.write(JSON.stringify({ continue: true }));
