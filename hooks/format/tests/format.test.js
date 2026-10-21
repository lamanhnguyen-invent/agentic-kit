#!/usr/bin/env node
/**
 * Tests for format.js
 *
 * Run: node --test hooks/format/tests/format.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

delete process.env.FORMAT_MODE;

const { formatterFor, filePathFor, prettierBin, main } = require('../format.js');

// A temp project with a stand-in prettier in node_modules that uppercases the file
function fakeProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'format-test-'));
  const pkg = path.join(dir, 'node_modules', 'prettier');
  fs.mkdirSync(path.join(pkg, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(pkg, 'package.json'), JSON.stringify({ name: 'prettier', bin: { prettier: './bin/prettier.cjs' } }));
  fs.writeFileSync(path.join(pkg, 'bin', 'prettier.cjs'),
    "const fs = require('fs'); const f = process.argv[3]; fs.writeFileSync(f, fs.readFileSync(f, 'utf8').toUpperCase());\n");
  fs.mkdirSync(path.join(dir, 'src'));
  return dir;
}

describe('formatterFor', () => {
  it('picks ruff for .py and .pyi', () => {
    assert.strictEqual(formatterFor('foo.py'), 'ruff');
    assert.strictEqual(formatterFor('foo.pyi'), 'ruff');
    assert.strictEqual(formatterFor('foo.PY'), 'ruff');
  });

  it('picks prettier for JS and TS files', () => {
    for (const ext of ['js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'mts', 'cts']) {
      assert.strictEqual(formatterFor(`foo.${ext}`), 'prettier', ext);
    }
  });

  it('skips other extensions and missing paths', () => {
    assert.strictEqual(formatterFor('foo.md'), undefined);
    assert.strictEqual(formatterFor('foo.json'), undefined);
    assert.strictEqual(formatterFor('foo.ipynb'), undefined);
    assert.strictEqual(formatterFor(undefined), undefined);
    assert.strictEqual(formatterFor(''), undefined);
  });
});

describe('filePathFor', () => {
  it('reads file_path from Edit and Write tool input', () => {
    assert.strictEqual(filePathFor('Edit', { file_path: 'a.py' }), 'a.py');
    assert.strictEqual(filePathFor('Write', { file_path: 'b.ts' }), 'b.ts');
  });

  it('returns undefined for other tools', () => {
    assert.strictEqual(filePathFor('Bash', { command: 'ls' }), undefined);
    assert.strictEqual(filePathFor('NotebookEdit', { notebook_path: 'n.ipynb' }), undefined);
  });
});

describe('prettier', () => {
  it('finds the project prettier from a file in a subfolder', () => {
    const dir = fakeProject();
    const bin = prettierBin(path.join(dir, 'src', 'a.ts'));
    assert.strictEqual(bin, path.join(dir, 'node_modules', 'prettier', 'bin', 'prettier.cjs'));
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('formats a TS file with the project prettier', () => {
    const dir = fakeProject();
    const file = path.join(dir, 'src', 'a.ts');
    fs.writeFileSync(file, 'const x = 1;\n');
    main({ tool_name: 'Edit', tool_input: { file_path: file }, cwd: dir });
    assert.strictEqual(fs.readFileSync(file, 'utf8'), 'CONST X = 1;\n');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('leaves a JS file alone when the project has no prettier', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'format-test-'));
    const file = path.join(dir, 'a.js');
    fs.writeFileSync(file, 'const x=1\n');
    assert.strictEqual(prettierBin(file), undefined);
    assert.doesNotThrow(() => main({ tool_name: 'Write', tool_input: { file_path: file }, cwd: dir }));
    assert.strictEqual(fs.readFileSync(file, 'utf8'), 'const x=1\n');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('main', () => {
  it('leaves other file types alone', () => {
    const dir = fakeProject();
    const file = path.join(dir, 'notes.md');
    fs.writeFileSync(file, 'hello');
    main({ tool_name: 'Write', tool_input: { file_path: file }, cwd: dir });
    assert.strictEqual(fs.readFileSync(file, 'utf8'), 'hello');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('no-ops when FORMAT_MODE=off', () => {
    const dir = fakeProject();
    const file = path.join(dir, 'a.ts');
    fs.writeFileSync(file, 'const x = 1;\n');
    process.env.FORMAT_MODE = 'off';
    main({ tool_name: 'Write', tool_input: { file_path: file }, cwd: dir });
    delete process.env.FORMAT_MODE;
    assert.strictEqual(fs.readFileSync(file, 'utf8'), 'const x = 1;\n');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('skips a path that does not exist on disk', () => {
    const file = path.join(os.tmpdir(), `format-missing-${Date.now()}.py`);
    assert.doesNotThrow(() => main({ tool_name: 'Write', tool_input: { file_path: file }, cwd: os.tmpdir() }));
  });
});
