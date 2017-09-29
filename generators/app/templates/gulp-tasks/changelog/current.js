const config = require('config');
const yargs = require('yargs');
const moment = require('moment');

const $ = require('gulp-load-plugins')();
const path = require('path');
const fs = require('fs');
const prependFile = require('prepend-file');

const ARGV_SETUP = {
  t: {
    alias: 'target',
    type: 'string',
    demand: true,
  },
  g: {
    alias: 'target-version',
    type: 'string',
    demand: true,
  },
};
const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss ZZ';
const PLACEHOLDER = {
  tag: '{tag}',
  time: '{time}',
  log: '{log}',
};

let argv = {};

function gitAdd() {
  const targetPath = path.join(config.dist, argv.target);
  const command = ['add', targetPath].join(' ');
  return new Promise((resolve, reject) => {
    $.git.exec({
      args: command,
      maxBuffer: config.stdoutMaxBuffer,
    }, (error, stdout) => {
      if (error) {
        reject(error);
      }
      resolve(targetPath);
    });
  });
}

function gitStatus() {
  const targetPath = path.join(config.dist, argv.target);
  const args = ['--porcelain', '--', targetPath].join(' ');
  return new Promise((resolve, reject) => {
    $.git.status({
      args,
      maxBuffer: config.stdoutMaxBuffer,
    }, (error, stdout) => {
      if (error) {
        reject(error);
      }
      resolve(stdout.trim());
    });
  });
}

function gitReset() {
  return new Promise((resolve, reject) => {
    $.git.reset('HEAD', {
      maxBuffer: config.stdoutMaxBuffer,
    }, (error) => {
      if (error) {
        reject(error);
      }
      resolve();
    });
  });
}

function generateChangelog(logBody) {
  const templateFile = config.template.changelog;
  const changelogFile = config.readme;
  return new Promise((resolve, reject) => {
    fs.readFile(templateFile, 'utf8', (error, template) => {
      const logContent = template
        .replace(PLACEHOLDER.tag, argv.targetVersion)
        .replace(PLACEHOLDER.time, moment().format(TIME_FORMAT))
        .replace(PLACEHOLDER.log, logBody);
      prependFile(changelogFile, logContent + '\n');
      resolve();
    });
  });
}

module.exports = function(taskDone) {
  argv = yargs.option(ARGV_SETUP).argv;
  gitAdd()
    .then(gitStatus)
    .then(generateChangelog)
    .then(gitReset)
    .then(taskDone)
    .catch(gitReset);
};
