var gulp = require("gulp");
var ts = require("gulp-typescript");
var run = require("gulp-run");
var merge = require('merge-stream');
var fs = require('fs');
var path = require("path");

function getFolders(dir) {
    return fs.readdirSync(dir)
      .filter(function(file) {
        return fs.statSync(path.join(dir, file)).isDirectory();
      });
}

var tsProject = ts.createProject("tsconfig.json");

gulp.task("default", ['build'], function () {
});

gulp.task("watch", ['build'], function(){
   gulp.watch(['src/**/*.ts', 'locale/**/*.json'], ['build']);
});

gulp.task('build', function() {
    return tsProject.src()
        .pipe(tsProject())
        .js.pipe(gulp.dest("lib"));
});

gulp.task('version-dev', ['build'], function(){
    return run('npm version prerelease -f').exec();
});

gulp.task('publish-dev', ['version-dev'], function(){
    return run('npm publish --tag next').exec();
});

gulp.task('version', ['build'], function(){
    return run('npm version patch').exec();
});

gulp.task('publish', ['version'], function(){
    return run('npm publish').exec();
});