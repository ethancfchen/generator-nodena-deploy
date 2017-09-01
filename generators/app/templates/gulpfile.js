const $ = require('gulp-load-plugins')();

const fs = require('fs');
const path = require('path');

const PATH_TASK_LOADER = 'gulptasks.js';

require('rootpath')();

if (fs.existsSync(path.resolve(__dirname, PATH_TASK_LOADER))) {
  require(path.resolve(__dirname, PATH_TASK_LOADER))();
} else {
  $.taskLoader();
}
