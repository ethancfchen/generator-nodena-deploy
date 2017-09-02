const config = require('config');
const yargs = require('yargs');
const path = require('path');

const gulp = require('gulp');
const $ = require('gulp-load-plugins')();

const ARGV_SETUP = {
  t: {
    alias: 'target',
    type: 'string',
    nargs: 1,
    demand: true,
  },
  v: {
    alias: 'version',
    type: 'string',
    nargs: 1,
    demand: true,
  },
};

let argv = {};

function gitTagList() {
  const command = ['tag', '-l', '--sort=v:refname'].join(' ');
  return new Promise((resolve, reject) => {
    $.git.exec({
      args: command,
      maxBuffer: config.stdoutMaxBuffer,
    }, (error, stdout) => {
      if (error) {
        reject(error);
      }
      resolve(stdout.trim().split('\n'));
    });
  });
}

function getDiffTags(tags) {
  const targetTag = argv.version;
  return new Promise((resolve, reject) => {
    let prevTag = '';
    if (!tags.includes(targetTag)) {
      reject(new Error(`Tag not found: ${targetTag}`));
    }
    prevTag = tags[tags.indexOf(targetTag) - 1] || '';
    resolve({prevTag, targetTag});
  });
}

function gitDiffTree(tags) {
  const srcTag = tags.prevTag;
  const destTag = tags.targetTag;
  const targetPath = path.join(config.base.dist, argv.target);
  return new Promise((resolve, reject) => {
    const command = [
      'diff-tree', '-r', '--name-only', '--no-commit-id',
      `${srcTag}..${destTag}`, '--', targetPath,
    ].join(' ');
    $.git.exec({
      args: command,
      maxBuffer: config.stdoutMaxBuffer,
    }, (error, stdout) => {
      if (error) {
        reject(error);
      }
      resolve(stdout.trim().split('\n'));
    });
  });
}

module.exports = function(taskCallback) {
  argv = yargs.option(ARGV_SETUP).argv;

  gitTagList()
    .then(getDiffTags)
    .then(gitDiffTree)
    .then((files) => {
      const target = argv.target;
      const version = argv.version;
      const distPath = path.join(config.base.dist, target);
      const blobs = files.map((filepath) => {
        return filepath.replace(distPath, '**');
      });
      gulp
        .src(blobs, {cwd: distPath})
        .pipe($.tar(`${version}.patch.tar`))
        .pipe($.gzip())
        .pipe(gulp.dest('./', {cwd: config.archive.patch}));
      taskCallback();
    })
    .catch(taskCallback);
};