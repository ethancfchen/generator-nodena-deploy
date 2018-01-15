const argv = require('yargs').option({
  d: {
    alias: 'dist',
    type: 'string',
    nargs: 1,
    demand: true,
  },
  r: {
    alias: 'release-version',
    type: 'string',
    nargs: 1,
    demand: true,
  },
}).argv;

module.exports = {
  argv,
  stdoutMaxBuffer: 1024 * 1024,

  dist: 'dist',
  archive: 'archive',
  template: {
    changelog: 'res/changelog.template.md',
  },
  readme: 'README.md',
};
