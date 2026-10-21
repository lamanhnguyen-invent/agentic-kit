#!/usr/bin/env node
/**
 * Format - PostToolUse Hook for Edit|Write
 * Formats the file Claude just wrote, so the pre-commit formatter hooks
 * rarely have to stop a commit. Logs to: ~/.claude/hooks-logs/
 *
 *   .py .pyi                          -> `ruff format` (`uvx ruff format` if ruff isn't on PATH)
 *   .js .jsx .mjs .cjs .ts .tsx .mts .cts -> the project's own Prettier (from node_modules)
 *
 * FORMAT_MODE=off disables this hook.
 *
 * Fails open: a missing formatter, another file type, or a formatting error
 * (e.g. a syntax error the formatter can't parse) never blocks or surfaces an
 * error to Claude — this hook is a convenience, not a gate. Pre-commit still
 * runs `ruff format` and `prettier` on every commit.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PY_EXTENSIONS = new Set(['.py', '.pyi']);
const JS_EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts']);

function log(data) {
  try {
    const dir = path.join(require('os').homedir(), '.claude', 'hooks-logs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${new Date().toISOString().slice(0, 10)}.jsonl`);
    fs.appendFileSync(file, JSON.stringify({ ts: new Date().toISOString(), hook: 'format', ...data }) + '\n');
  } catch {}
}

function formatterFor(filePath) {
  const ext = path.extname(filePath || '').toLowerCase();
  if (PY_EXTENSIONS.has(ext)) return 'ruff';
  if (JS_EXTENSIONS.has(ext)) return 'prettier';
  return undefined;
}

function filePathFor(toolName, toolInput) {
  if (toolName === 'Edit' || toolName === 'Write') return toolInput?.file_path;
  return undefined;
}

function runRuff(filePath, cwd) {
  let result = spawnSync('ruff', ['format', filePath], { cwd, encoding: 'utf8' });
  if (result.error && result.error.code === 'ENOENT') {
    result = spawnSync('uvx', ['ruff', 'format', filePath], { cwd, encoding: 'utf8' });
  }
  return result;
}

// The project's own Prettier, found from the file's folder upwards like
// `npx --no-install` would; run with node directly (no shell, no download).
function prettierBin(filePath) {
  try {
    const pkgPath = require.resolve('prettier/package.json', { paths: [path.dirname(path.resolve(filePath))] });
    const { bin } = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const rel = typeof bin === 'string' ? bin : bin?.prettier;
    return rel ? path.join(path.dirname(pkgPath), rel) : undefined;
  } catch {
    return undefined;
  }
}

function runPrettier(filePath, cwd) {
  const bin = prettierBin(filePath);
  if (!bin) return { skipped: 'prettier not installed in the project' };
  return spawnSync(process.execPath, [bin, '--write', filePath], { cwd, encoding: 'utf8' });
}

function main(data) {
  const { tool_name, tool_input, cwd, session_id } = data;
  if (process.env.FORMAT_MODE === 'off') return;
  const filePath = filePathFor(tool_name, tool_input);
  const formatter = formatterFor(filePath);
  if (!formatter || !fs.existsSync(filePath)) return;

  const result = formatter === 'ruff' ? runRuff(filePath, cwd) : runPrettier(filePath, cwd);
  if (result.skipped) {
    log({ level: 'SKIP', formatter, file: filePath, reason: result.skipped, session_id });
  } else if (result.error) {
    log({ level: 'ERROR', formatter, file: filePath, error: result.error.message, session_id });
  } else if (result.status !== 0) {
    log({ level: 'WARN', formatter, file: filePath, status: result.status, stderr: result.stderr?.trim(), session_id });
  } else {
    log({ level: 'OK', formatter, file: filePath, session_id });
  }
}

async function readStdin() {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  return input;
}

if (require.main === module) {
  readStdin().then((input) => {
    try {
      main(JSON.parse(input));
    } catch (e) {
      log({ level: 'ERROR', error: e.message });
    }
    console.log('{}');
  });
} else {
  module.exports = { formatterFor, filePathFor, prettierBin, main };
}
