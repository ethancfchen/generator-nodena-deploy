const path = require('path');
const assert = require('yeoman-assert');
const helpers = require('yeoman-test');

const appAssets = [
  'gulp-tasks',
  'gulp-tasks/archive/full.js',
  'gulp-tasks/archive/patch.js',
  'gulp-tasks/changelog/current.js',
  'gulp-tasks/changelog/tag.js',
  'res',
  'res/changelog.template.md',
  'config',
  'config/default.js',
  '.editorconfig',
  '.eslintignore',
  '.eslintrc.js',
  '.gitignore',
  'gulpfile.js',
  'gulptasks.js',
  'package.json',
  'README.md',
];
const appOnlyTemplates = [
  '_tmp_.eslintignore',
  '_tmp_.eslintrc.js',
  '_tmp_.gitignore',
];

describe('generator-nodena-deploy:app', () => {
  beforeAll(() => {
    return helpers
      .run(path.join(__dirname, '../generators/app'));
  });

  it('creates files', () => {
    assert.file(appAssets);
  });

  it('not includes templates', () => {
    assert.noFile(appOnlyTemplates);
  });
});
