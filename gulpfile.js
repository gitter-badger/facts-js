(function () {
    'use strict';

    var gulp = require('gulp'),
        mocha = require('gulp-mocha'),
        jshint = require('gulp-jshint');

    gulp.task('lint', function () {
        gulp.src('./facts.js')
            .pipe(jshint())
            .pipe(jshint.reporter('default'))
            .pipe(jshint.reporter('fail'));
    });

    gulp.task('test', function () {
        gulp.src('test.js').pipe(mocha({reporter: 'spec'}));
    });

    gulp.task('default', ['lint', 'test']);
})();
