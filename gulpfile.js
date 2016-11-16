var gulp = require("gulp");
var ts = require("gulp-typescript");
var run = require("gulp-run");

var tsProject = ts.createProject("tsconfig.json");

gulp.task("default", ['build'], function () {
});

gulp.task("dev", function(){
   gulp.watch(['src/**/*.ts', 'gulpfile.js'], ['publish-dev']); 
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
    return run('npm publish --tag dev').exec();
});

// gulp.task('update-sample', ['publish-dev'], function(callback){
//     return run('npm install --save botauth@dev').exec({ cwd : 'examples/dropbox'});
// });