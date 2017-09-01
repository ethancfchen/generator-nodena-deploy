const Generator = require('yeoman-generator');

const mkdirp = require('mkdirp');
const _ = require('lodash');
const commandExists = require('command-exists');
const sortPackageJson = require('sort-package-json');

const ASSETS = {
  package: 'package.json',
  mkdirp: [
    'gulp-tasks',
    'res',
    'config',
  ],
  copy: [{
    src: 'gulp-tasks/**/*',
    dest: 'gulp-tasks',
  }, {
    src: 'res/**/*',
    dest: 'res',
  }, {
    src: 'config/*',
    dest: 'config',
  }],
  copyTmp: [
    '.eslintignore',
    '.eslintrc.js',
    '.gitignore',
  ],
  copyTpl: [
    '.editorconfig',
    'gulptasks.js',
    'gulpfile.js',
    'README.md',
  ],
};

function extendPackage(generator, template) {
  const packageFile = generator.destinationPath(ASSETS.package);
  const extPackageFile = generator.templatePath(ASSETS.package);
  const manifest = generator.fs.readJSON(packageFile, {});
  const extManifest = generator.fs.readJSON(extPackageFile, {});
  const merged = _.merge(manifest, extManifest, {
    name: template.appname,
    description: template.appname,
    author: template.author,
  });
  generator.fs.writeJSON(packageFile, sortPackageJson(merged));
}

function createFolders() {
  ASSETS.mkdirp.forEach((dir) => {
    mkdirp(dir);
  });
}

function copyAllFiles(generator) {
  ASSETS.copy.forEach((path) => {
    generator.fs.copy(
      generator.templatePath(path.src),
      generator.destinationPath(path.dest)
    );
  });
}

function copyAllTmpFiles(generator) {
  ASSETS.copyTmp.forEach((path) => {
    generator.fs.copy(
      generator.templatePath('_tmp_' + path),
      generator.destinationPath(path)
    );
  });
}

function copyAllTplFiles(generator, template) {
  ASSETS.copyTpl.forEach((path) => {
    generator.fs.copyTpl(
      generator.templatePath(path),
      generator.destinationPath(path),
      template
    );
  });
}

module.exports = class extends Generator {
  writing() {
    const template = {
      appname: _.kebabCase(this.appname),
      author: {
        name: this.user.git.name(),
        email: this.user.git.email(),
      },
    };
    extendPackage(this, template);
    createFolders();
    copyAllFiles(this);
    copyAllTmpFiles(this);
    copyAllTplFiles(this, template);
  }

  install() {
    commandExists('yarn', (err, isExists) => {
      if (!err && isExists) {
        this.spawnCommand('yarn');
      } else {
        this.npmInstall();
      }
    });
  }
};
