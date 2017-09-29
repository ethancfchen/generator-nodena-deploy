const config = require('config');
const yargs = require('yargs');

const $ = require('gulp-load-plugins')();

const path = require('path');
const fs = require('fs');

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
      quiet: true,
    }, (error, stdout) => {
      if (error) {
        reject(error);
      }
      resolve(stdout.trim().split('\n'));
    });
  });
}

function getDiffTags(allTags) {
  const targetTag = argv.targetVersion;
  return new Promise((resolve, reject) => {
    let prevTag = '';
    if (!allTags.includes(targetTag)) {
      reject(new Error(`Tag not found: ${targetTag}`));
    }
    prevTag = allTags[allTags.indexOf(targetTag) - 1] || '';
    resolve({prevTag, targetTag});
  });
}

function gitLogNameStatus(tag) {
  const srcTag = tag.prevTag;
  const destTag = tag.targetTag;
  const targetPath = path.join(config.dist, argv.target);
  return new Promise((resolve, reject) => {
    const command = [
      'log', '--name-status', '--oneline', '--pretty=""',
      `${srcTag}..${destTag}`, '--', targetPath,
    ].join(' ');
    $.git.exec({
      args: command,
      maxBuffer: config.stdoutMaxBuffer,
      quiet: true,
    }, (error, stdout) => {
      if (error) {
        reject(error);
      }
      resolve(stdout.trim());
    });
  });
}

function gitLogCommitTime(logBody) {
  const version = argv.targetVersion;
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
    fs.readFile(templateFile, 'utf8', (error, template) => {
      const logContent = template
        .replace(PLACEHOLDER.tag, log.version)
        .replace(PLACEHOLDER.time, log.time)
        .replace(PLACEHOLDER.log, log.body);
      resolve(logContent);
    });
  });
}

function display(logContent) {
  return new Promise((resolve, reject) => {
    process.stdout.write(logContent);
    resolve();
  });
}

module.exports = function(taskDone) {
  argv = yargs.option(ARGV_SETUP).argv;
  gitTagList()
    .then(getDiffTags)
    .then(gitLogNameStatus)
    .then(gitLogCommitTime)
    .then(generateChangelog)
    .then(display)
    .then(taskDone)
    .catch(taskDone);
};
