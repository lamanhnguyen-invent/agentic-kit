#!/usr/bin/env node
/**
 * Ruff Format - PostToolUse Hook for Edit|Write
 * Formats a Python file with `ruff format` right after Claude writes to it,
 * instead of waiting for the pre-commit `ruff-format` hook. Logs to:
 * ~/.claude/hooks-logs/
 *
 * RUFF_FORMAT_MODE=off disables this hook.
 *
 * Fails open: a missing `ruff`/`uvx`, a non-Python file, or a formatting
 * error (e.g. a syntax error ruff can't parse) never blocks or surfaces an
 * error to Claude — this hook is a convenience, not a gate. `ruff check`
 * (lint) still runs in pre-commit and can block there.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PY_EXTENSIONS = new Set(['.py', '.pyi']);

function log(data) {
  try {
    const dir = path.join(require('os').homedir(), '.claude', 'hooks-logs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${new Date().toISOString().slice(0, 10)}.jsonl`);
    fs.appendFileSync(file, JSON.stringify({ ts: new Date().toISOString(), hook: 'ruff-format', ...data }) + '\n');
  } catch {}
}

function isPythonFile(filePath) {
  return !!filePath && PY_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function filePathFor(toolName, toolInput) {
  if (toolName === 'Edit' || toolName === 'Write') return toolInput?.file_path;
  return undefined;
}

function runRuffFormat(filePath, cwd) {
  let result = spawnSync('ruff', ['format', filePath], { cwd, encoding: 'utf8' });
  if (result.error && result.error.code === 'ENOENT') {
    result = spawnSync('uvx', ['ruff', 'format', filePath], { cwd, encoding: 'utf8' });
  }
  return result;
}

function main(data) {
  const { tool_name, tool_input, cwd, session_id } = data;
  if (process.env.RUFF_FORMAT_MODE === 'off') return;
  const filePath = filePathFor(tool_name, tool_input);
  if (!isPythonFile(filePath) || !fs.existsSync(filePath)) return;

  const result = runRuffFormat(filePath, cwd);
  if (result.error) {
    log({ level: 'ERROR', file: filePath, error: result.error.message, session_id });
  } else if (result.status !== 0) {
    log({ level: 'WARN', file: filePath, status: result.status, stderr: result.stderr?.trim(), session_id });
  } else {
    log({ level: 'OK', file: filePath, session_id });
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
  module.exports = { isPythonFile, filePathFor, main };
}
