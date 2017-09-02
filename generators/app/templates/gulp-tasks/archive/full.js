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

function archive(files) {
  const target = argv.target;
  const version = argv.version;
  const distPath = path.join(config.dist, target);
  return new Promise((resolve, reject) => {
    gulp
      .src('**/*', {cwd: distPath})
      .pipe($.tar(`${version}.tar`))
      .pipe($.gzip())
      .pipe(gulp.dest('./', {cwd: config.archive}))
      .on('end', resolve)
      .on('error', reject);
  });
}

module.exports = function(taskCallback) {
  argv = yargs.option(ARGV_SETUP).argv;
  gitCheckoutTo(argv.version)
    .then((files) => archive(files))
    .then(gitCheckoutTo)
    .catch(taskCallback);
};
