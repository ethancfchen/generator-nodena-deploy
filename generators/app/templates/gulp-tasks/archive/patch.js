const path = require('path');
const gulp = require('gulp');
const $ = require('gulp-load-plugins')();
const config = require('config');

function gitCheckoutTo(commit, dist) {
  return new Promise((resolve, reject) => {
    const distPath = path.join(config.dist, dist);
    const args = ['checkout', commit, distPath].join(' ');
    const maxBuffer = config.stdoutMaxBuffer;
    $.git.exec({args, maxBuffer}, (error) => {
      if (error) return reject(error);
      resolve();
    });
  });
}

function gitTagList() {
  return new Promise((resolve, reject) => {
    const args = ['tag', '-l', '--sort=v:refname'].join(' ');
    const maxBuffer = config.stdoutMaxBuffer;
    $.git.exec({args, maxBuffer}, (error, stdout) => {
      if (error) return reject(error);
      resolve(stdout.trim().split('\n'));
    });
  });
}

function getDiffTags(allTags, target) {
  return new Promise((resolve, reject) => {
    if (!allTags.includes(target)) {
      return reject(new Error(`Tag not found: ${target}`));
    }
    resolve({
      src: allTags[allTags.indexOf(target) - 1] || '',
      dest: target,
    });
  });
}

function gitDiffTree(tags, target) {
  return new Promise((resolve, reject) => {
    const srcTag = tags.src;
    const destTag = tags.dest;
    const distPath = path.join(config.dist, target);
    const args = [
      'diff-tree', '-r', '--name-only', '--no-commit-id',
      srcTag.length > 0 ? `${srcTag}..${destTag}` : destTag,
      '--', distPath,
    ].join(' ');
    const maxBuffer = config.stdoutMaxBuffer;
    $.git.exec({args, maxBuffer}, (error, stdout) => {
      if (error) return reject(error);
      resolve(stdout.trim().split('\n'));
    });
  });
}

function archive(files, target, version) {
  return new Promise((resolve, reject) => {
    const distPath = path.join(config.dist, target);
    const archivePath = config.archive;
    const blobs = Array.prototype.map.call(files || [], (filepath) => {
      return filepath.replace(distPath, '**');
    });
    gulp
      .src(blobs, {cwd: distPath})
      .pipe($.tar(`${version}.patch.tar`))
      .pipe($.gzip())
      .pipe(gulp.dest('./', {cwd: archivePath}))
      .on('end', resolve)
      .on('error', reject);
  });
}

module.exports = function(taskDone) {
  const argv = config.argv;
  const dist = argv.dist;
  const version = argv.releaseVersion;
  gitCheckoutTo(version, dist)
    .then(() => gitTagList())
    .then((allTags) => getDiffTags(allTags, version))
    .then((tags) => gitDiffTree(tags, dist))
    .then((files) => archive(files, dist, version))
    .then(() => gitCheckoutTo('HEAD', dist))
    .then(taskDone)
    .catch(taskDone);
};
