#!/usr/bin/env node
/**
 * Tests for ruff-format.js
 *
 * Run: node --test hooks/ruff-format/tests/ruff-format.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

delete process.env.RUFF_FORMAT_MODE;

const { isPythonFile, filePathFor, main } = require('../ruff-format.js');

describe('isPythonFile', () => {
  it('accepts .py and .pyi', () => {
    assert.strictEqual(isPythonFile('foo.py'), true);
    assert.strictEqual(isPythonFile('foo.pyi'), true);
    assert.strictEqual(isPythonFile('foo.PY'), true);
  });

  it('rejects other extensions and missing paths', () => {
    assert.strictEqual(isPythonFile('foo.js'), false);
    assert.strictEqual(isPythonFile('foo.ipynb'), false);
    assert.strictEqual(isPythonFile(undefined), false);
    assert.strictEqual(isPythonFile(''), false);
  });
});

describe('filePathFor', () => {
  it('reads file_path from Edit and Write tool input', () => {
    assert.strictEqual(filePathFor('Edit', { file_path: 'a.py' }), 'a.py');
    assert.strictEqual(filePathFor('Write', { file_path: 'b.py' }), 'b.py');
  });

  it('returns undefined for other tools', () => {
    assert.strictEqual(filePathFor('Bash', { command: 'ls' }), undefined);
    assert.strictEqual(filePathFor('NotebookEdit', { notebook_path: 'n.ipynb' }), undefined);
  });
});

describe('main', () => {
  it('skips non-Python files without touching disk', () => {
    const file = path.join(os.tmpdir(), `ruff-format-test-${Date.now()}.txt`);
    fs.writeFileSync(file, 'hello');
    assert.doesNotThrow(() => main({ tool_name: 'Write', tool_input: { file_path: file }, cwd: os.tmpdir() }));
    fs.unlinkSync(file);
  });

  it('no-ops when RUFF_FORMAT_MODE=off', () => {
    process.env.RUFF_FORMAT_MODE = 'off';
    const file = path.join(os.tmpdir(), `ruff-format-test-${Date.now()}.py`);
    fs.writeFileSync(file, 'x=1\n');
    assert.doesNotThrow(() => main({ tool_name: 'Write', tool_input: { file_path: file }, cwd: os.tmpdir() }));
    delete process.env.RUFF_FORMAT_MODE;
    fs.unlinkSync(file);
  });

  it('skips a Python path that does not exist on disk', () => {
    const file = path.join(os.tmpdir(), `ruff-format-missing-${Date.now()}.py`);
    assert.doesNotThrow(() => main({ tool_name: 'Write', tool_input: { file_path: file }, cwd: os.tmpdir() }));
  });
});
