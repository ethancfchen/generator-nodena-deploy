const config = require('config');
const argv = require('yargs').option({
  p: {
    alias: 'path',
    type: 'string',
    nargs: 1,
    default: config.assets.dist,
  },
  t: {
    alias: 'tag',
    type: 'string',
    nargs: 1,
    demand: true,
  },
}).argv;

const $ = require('gulp-load-plugins')();
const fs = require('fs');
const prependFile = require('prepend-file');

const PLACEHOLDER = {
  tag: '{tag}',
  time: '{time}',
  log: '{log}',
};

function gitAdd(targetPath) {
  const command = ['add', targetPath].join(' ');
  return new Promise((resolve, reject) => {
    $.git.exec({
      args: command,
      maxBuffer: config.stdoutMaxBuffer,
    }, (error, stdout) => {
      if (error) {
        reject(error);
      }
      resolve(targetPath, stdout);
    });
  });
}

function gitStatus(targetPath) {
  const args = ['--porcelain', '--', targetPath].join(' ');
  return new Promise((resolve, reject) => {
    $.git.status({
      args,
      maxBuffer: config.stdoutMaxBuffer,
    }, (error, stdout) => {
      if (error) {
        reject(error);
      }
      resolve(stdout);
    });
  });
}

function gitLogCommitTime() {
  const args = ['log', '-1', '--date=iso', '--format=%cd'].join(' ');
  return new Promise((resolve, reject) => {
    $.git.exec({
      args,
      maxBuffer: config.stdoutMaxBuffer,
    }, (error, stdout) => {
      if (error) {
        reject(error);
      }
      resolve(stdout);
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
  const assets = config.assets;
  const templateFile = assets.template.changelog;
  const changelogFile = assets.readme;
  return new Promise((resolve, reject) => {
    fs.readFile(templateFile, 'utf8', (error, template) => {
      gitLogCommitTime()
        .then((commitTime) => {
          const logContent = template
            .replace(PLACEHOLDER.tag, argv.tag)
            .replace(PLACEHOLDER.time, commitTime.trim())
            .replace(PLACEHOLDER.log, logBody.trim());
          prependFile(changelogFile, logContent + '\n');
          resolve();
        })
        .catch(reject);
    });
  });
}

module.exports = function(taskCallback) {
  gitAdd(argv.path)
    .then(gitStatus)
    .then(generateChangelog)
    .then(gitReset)
    .catch(gitReset)
    .then(taskCallback);
};
