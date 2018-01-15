const path = require('path');
const fs = require('fs');
const moment = require('moment');
const $ = require('gulp-load-plugins')();
const prependFile = require('prepend-file');
const config = require('config');

const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss ZZ';
const PLACEHOLDER = {
  tag: '{tag}',
  time: '{time}',
  log: '{log}',
};

function gitAdd(dist) {
  return new Promise((resolve, reject) => {
    const distPath = path.join(config.dist, dist);
    const args = ['add', distPath].join(' ');
    const maxBuffer = config.stdoutMaxBuffer;
    $.git.exec({args, maxBuffer}, (error, stdout) => {
      if (error) return reject(error);
      resolve(distPath);
    });
  });
}

function gitStatus(dist) {
  return new Promise((resolve, reject) => {
    const distPath = path.join(config.dist, dist);
    const args = ['--porcelain', '--', distPath].join(' ');
    const maxBuffer = config.stdoutMaxBuffer;
    $.git.status({args, maxBuffer}, (error, stdout) => {
      if (error) return reject(error);
      resolve(stdout.trim());
    });
  });
}

function gitReset() {
  return new Promise((resolve, reject) => {
    const maxBuffer = config.stdoutMaxBuffer;
    $.git.reset('HEAD', {maxBuffer}, (error, stdout) => {
      if (error) return reject(error);
      resolve(stdout);
    });
  });
}

function generateChangelog(logBody, version) {
  return new Promise((resolve, reject) => {
    const templateFile = config.template.changelog;
    const changelogFile = config.readme;
    fs.readFile(templateFile, 'utf8', (error, template) => {
      const logContent = template
        .replace(PLACEHOLDER.tag, version)
        .replace(PLACEHOLDER.time, moment().format(TIME_FORMAT))
        .replace(PLACEHOLDER.log, logBody);
      if (error) return reject(error);
      prependFile(changelogFile, logContent + '\n');
      resolve(logContent);
    });
  });
}

module.exports = function(taskDone) {
  const argv = config.argv;
  const dist = argv.dist;
  const version = argv.releaseVersion;
  gitAdd(dist)
    .then(() => gitStatus(dist))
    .then((logBody) => generateChangelog(logBody, version))
    .then(() => gitReset())
    .then(taskDone)
    .catch(gitReset);
};
