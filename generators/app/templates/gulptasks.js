const gulp = require('gulp');
const $ = require('gulp-load-plugins')();

const GulpRegistry = require('undertaker-forward-reference');

module.exports = function() {
  gulp.registry(new GulpRegistry());

  $.loadAllTasks();

  gulp.task('default', gulp.series('build'));
};
