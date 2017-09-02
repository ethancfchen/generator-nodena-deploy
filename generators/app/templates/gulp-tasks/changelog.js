const config = require('config');
const yargs = require('yargs');

const $ = require('gulp-load-plugins')();
const path = require('path');
const fs = require('fs');
const prependFile = require('prepend-file');

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
const PLACEHOLDER = {
  tag: '{tag}',
  time: '{time}',
  log: '{log}',
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
  let targetTag = argv.version;
  return new Promise((resolve, reject) => {
    let prevTag = '';
    if (!tags.includes(targetTag)) {
      targetTag = 'HEAD';
    }
    prevTag = tags[tags.indexOf(targetTag) - 1] || '';
    resolve({prevTag, targetTag});
  });
}

function gitLogNameStatus(tags) {
  const srcTag = tags.prevTag;
  const destTag = tags.targetTag;
  const targetPath = path.join(config.dist, argv.target);
  return new Promise((resolve, reject) => {
    const command = [
      'log', '--name-status', '--oneline', '--pretty=""',
      `${srcTag}..${destTag}`, '--', targetPath,
    ].join(' ');
    $.git.exec({
      args: command,
      maxBuffer: config.stdoutMaxBuffer,
    }, (error, stdout) => {
      if (error) {
        reject(error);
      }
      resolve(stdout.trim());
    });
  });
}

function gitLogCommitTime(logBody) {
  const version = argv.version;
  return new Promise((resolve, reject) => {
    const args = ['log', '-1', '--format=%ai', version].join(' ');
    $.git.exec({
      args,
      maxBuffer: config.stdoutMaxBuffer,
    }, (error, stdout) => {
      if (error) {
        reject(error);
      }
      resolve({
        version,
        time: stdout.trim(),
        body: logBody,
      });
    });
  });
}

function generateChangelog(log) {
  return new Promise((resolve, reject) => {
    const templateFile = config.template.changelog;
    const changelogFile = config.readme;
    fs.readFile(templateFile, 'utf8', (error, template) => {
      const logContent = template
        .replace(PLACEHOLDER.tag, log.version)
        .replace(PLACEHOLDER.time, log.time)
        .replace(PLACEHOLDER.log, log.body);
      prependFile(changelogFile, logContent + '\n');
      resolve();
    });
  });
}

module.exports = function(taskCallback) {
  argv = yargs.option(ARGV_SETUP).argv;
  gitTagList()
    .then(getDiffTags)
    .then(gitLogNameStatus)
    .then(gitLogCommitTime)
    .then(generateChangelog)
    .catch(taskCallback);
};
