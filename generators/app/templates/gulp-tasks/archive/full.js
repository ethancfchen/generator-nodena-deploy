const path = require('path');
const gulp = require('gulp');
const $ = require('gulp-load-plugins')();
const config = require('config');

function gitCheckoutTo(commit, dist) {
  return new Promise((resolve, reject) => {
    const distPath = path.join(config.dist, dist);
    const args = ['checkout', commit, distPath].join(' ');
    const maxBuffer = config.stdoutMaxBuffer;
    $.git.exec({args, maxBuffer}, (error, stdout) => {
      if (error) return reject(error);
      resolve();
    });
  });
}

function archive(target, version) {
  return new Promise((resolve, reject) => {
    const distPath = path.join(config.dist, target);
    const archivePath = config.archive;
    gulp
      .src('**/*', {cwd: distPath})
      .pipe($.tar(`${version}.tar`))
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
    .then(() => archive(dist, version))
    .then(() => gitCheckoutTo('HEAD', dist))
    .then(taskDone)
    .catch(taskDone);
};
