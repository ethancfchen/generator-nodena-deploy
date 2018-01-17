const path = require('path');
const fs = require('fs');
const $ = require('gulp-load-plugins')();
const config = require('config');

const PLACEHOLDER = {
  tag: '{tag}',
  time: '{time}',
  log: '{log}',
};
const TAG_SEPARATOR = '-';

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
      src: getPreviousTag(allTags, target),
      dest: target,
    });
  });
}

function getPreviousTag(allTags, target) {
  const prefix = target.split(TAG_SEPARATOR).slice(0, -1).join(TAG_SEPARATOR);
  const candidates = Array.prototype.filter.call(allTags, (item) => {
    return item.startsWith(prefix);
  });
  return candidates[candidates.indexOf(target) - 1] || '';
}

function gitLogNameStatus(tags, dist) {
  const srcTag = tags.src;
  const destTag = tags.dest;
  const distPath = path.join(config.dist, dist);
  return new Promise((resolve, reject) => {
    const args = [
      'log', '--name-status', '--oneline', '--pretty=""',
      `${srcTag}..${destTag}`, '--', distPath,
    ].join(' ');
    const maxBuffer = config.stdoutMaxBuffer;
    $.git.exec({args, maxBuffer}, (error, stdout) => {
      if (error) return reject(error);
      resolve(stdout.trim());
    });
  });
}

function gitLogCommitTime(logBody, version) {
  return new Promise((resolve, reject) => {
    const args = ['log', '-1', '--format=%ai', version].join(' ');
    $.git.exec({
      args,
      maxBuffer: config.stdoutMaxBuffer,
    }, (error, stdout) => {
      if (error) return reject(error);
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
      if (error) return reject(error);
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
  const argv = config.argv;
  const dist = argv.dist;
  const version = argv.releaseVersion;
  gitTagList()
    .then((allTags) => getDiffTags(allTags, version))
    .then((tags) => gitLogNameStatus(tags, dist))
    .then((logBody) => gitLogCommitTime(logBody, version))
    .then((log) => generateChangelog(log))
    .then((log) => display(log))
    .then(taskDone)
    .catch(taskDone);
};
