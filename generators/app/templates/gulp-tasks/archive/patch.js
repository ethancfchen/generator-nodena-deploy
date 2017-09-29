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
  g: {
    alias: 'target-version',
    type: 'string',
    nargs: 1,
    demand: true,
  },
};

let argv = {};

function gitCheckoutTo(version) {
  const targetTag = version || 'HEAD';
  const targetPath = path.join(config.dist, argv.target);
  return new Promise((resolve, reject) => {
    const command = ['checkout', targetTag, targetPath].join(' ');
    $.git.exec({
      args: command,
      maxBuffer: config.stdoutMaxBuffer,
    }, (error) => {
      if (error) {
        reject(error);
      }
      resolve();
    });
  });
}

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
  const targetTag = argv.targetVersion;
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
  const targetPath = path.join(config.dist, argv.target);
  return new Promise((resolve, reject) => {
    const command = [
      'diff-tree', '-r', '--name-only', '--no-commit-id',
      srcTag.length > 0 ? `${srcTag}..${destTag}` : destTag,
      '--', targetPath,
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

function archive(files) {
  const target = argv.target;
  const targetVersion = argv.targetVersion;
  const distPath = path.join(config.dist, target);
  return new Promise((resolve, reject) => {
    const blobs = files.map((filepath) => {
      return filepath.replace(distPath, '**');
    });
    gulp
      .src(blobs, {cwd: distPath})
      .pipe($.tar(`${targetVersion}.patch.tar`))
      .pipe($.gzip())
      .pipe(gulp.dest('./', {cwd: config.archive}))
      .on('end', resolve)
      .on('error', reject);
  });
}

module.exports = function(taskDone) {
  argv = yargs.option(ARGV_SETUP).argv;
  gitCheckoutTo(argv.targetVersion)
    .then(gitTagList)
    .then((tags) => getDiffTags(tags))
    .then((tags) => gitDiffTree(tags))
    .then((files) => archive(files))
    .then(gitCheckoutTo)
    .then(taskDone)
    .catch(taskDone);
};
