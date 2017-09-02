const path = require('path');
const defer = require('config/defer').deferConfig;

module.exports = {
  stdoutMaxBuffer: 1024 * 1024,

  base: {
    dist: 'dist',
    archive: 'archive',
  },
  archive: {
    full: defer((config) => {
      return path.join(config.base.archive, 'full');
    }),
    patch: defer((config) => {
      return path.join(config.base.archive, 'patch');
    }),
  },
  template: {
    changelog: 'res/changelog.template.md',
  },
  readme: 'README.md',
};
