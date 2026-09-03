import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Guards the release-bundle stamping contract.
 *
 * `make build-theme` and `.github/workflows/release.yml` both assemble the
 * shipped bundle by copying `template/` and then substituting the version out
 * of `package.json`: a `sed` over `template/package.json` replaces the literal
 * token `VERSION`, and a second `sed` over `template.yml` rewrites its
 * line-initial `version:` field.
 *
 * Those substitutions are silent no-ops if the placeholder is edited away or
 * the `version:` line is reshaped, and the failure only shows up as a bundle
 * that claims the wrong version — after the release is published. This test is
 * the cheap version of that discovery. It runs in CI (`ci.yml`) and again in
 * `release.yml` before the artifact is built.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));

const PACKAGE_NAME = '@quantecon/report-theme';
const ZIP_BASENAME = 'quantecon-theme-report';

test('package.json carries the report theme name', () => {
  assert.equal(readJson('package.json').name, PACKAGE_NAME);
});

test('template/package.json ships the VERSION placeholder the build stamps', () => {
  const pkg = readJson('template/package.json');
  assert.equal(pkg.name, PACKAGE_NAME, 'the shipped bundle must carry the same package name');
  assert.equal(
    pkg.version,
    'VERSION',
    'template/package.json is copied verbatim and sed-substituted; the literal placeholder must survive',
  );
});

test('template.yml has a stampable `version:` line and the report title', () => {
  const templateYml = read('template.yml');
  const version = templateYml.match(/^version: (.+)$/m);
  assert.ok(version, 'template.yml needs a line-initial `version:` for the release sed to rewrite');
  assert.match(
    version[1].trim(),
    /^\d+\.\d+\.\d+$/,
    'the committed version must be a plain semver so a stale value is obvious in review',
  );
  assert.match(templateYml, /^title: QuantEcon Report Theme$/m);
});

test('the committed template.yml version matches package.json', () => {
  // The release workflow stamps this, so drift is harmless at build time — but
  // the committed value is what a reader of the repo sees, so keep them equal.
  const { version } = readJson('package.json');
  assert.match(read('template.yml'), new RegExp(`^version: ${version.replace(/\./g, '\\.')}$`, 'm'));
});

test('the Makefile and the release workflow agree on the zip name', () => {
  assert.match(read('Makefile'), new RegExp(`^THEME = ${ZIP_BASENAME}$`, 'm'));
  const release = read('.github/workflows/release.yml');
  assert.ok(
    release.includes(`${ZIP_BASENAME}.zip`),
    `release.yml must attach ${ZIP_BASENAME}.zip — consumers pin that URL`,
  );
});

test('no lecture theme names leaked through the scaffold copy', () => {
  // The scaffold was copied from quantecon-theme.mystmd; these are the names
  // that must not have come with it. References to the lecture *repository*
  // (in prose, links and comments) are fine and deliberate.
  const forbidden = ['@quantecon/lecture-theme', 'QuantEcon Lecture Theme'];
  const files = [
    'package.json',
    'template/package.json',
    'template.yml',
    'Makefile',
    '.github/workflows/ci.yml',
    '.github/workflows/preview.yml',
    '.github/workflows/release.yml',
    '.github/workflows/update-snapshots.yml',
  ];
  for (const file of files) {
    const contents = read(file);
    for (const name of forbidden) {
      assert.ok(!contents.includes(name), `${file} still mentions "${name}"`);
    }
  }
});
