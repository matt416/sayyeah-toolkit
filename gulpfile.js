'use strict';

// modules
var assemble = require('fabricator-assemble');
var browserSync = require('browser-sync');
var csso = require('gulp-csso');
var del = require('del');
var gulp = require('gulp');
var gutil = require('gulp-util');
var gulpif = require('gulp-if');
var imagemin = require('gulp-imagemin');
var prefix = require('gulp-autoprefixer');
var rename = require('gulp-rename');
var reload = browserSync.reload;
var runSequence = require('run-sequence');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var webpack = require('webpack');
var symbols = require('gulp-svg-symbols');
var svgmin = require('gulp-svgmin');
var path = require('path');
var sassData = require('fabricator-sass-data');

// Local Modules
var helpers = require('../helpers'); // Extra Handlebars Helpers

// configuration
var config = {
	dev: gutil.env.dev,
	src: {
		scripts: {
			fabricator: './src/assets/fabricator/scripts/fabricator.js',
			toolkit: './src/assets/toolkit/scripts/app.js'
		},
		styles: {
			fabricator: 'src/assets/fabricator/styles/fabricator.sass',
			toolkit: 'src/assets/toolkit/styles/styles-toolkit.sass',
			production: 'src/assets/toolkit/styles/styles.sass'

		},
		fonts : {
			toolkit: 'src/assets/toolkit/fonts/**/*'
		},
		images: 'src/assets/toolkit/images/**/*',
		svgs: 'src/assets/toolkit/svgs/**/*.svg',
		views: 'src/toolkit/views/*.html'
	},
	dest: 'dist'
};


// webpack
var webpackConfig = require('./webpack.config')(config);
var webpackCompiler = webpack(webpackConfig);

gulp.task('sass-data', function () {
    return gulp.src('src/assets/toolkit/styles/variables/**/*.{sass,scss}')
        .pipe(sassData())
       	.pipe(gulp.dest('src/data'));
});

// clean
gulp.task('clean', function () {
	return del([config.dest]);
});


// styles
gulp.task('styles:fabricator', function () {
	gulp.src(config.src.styles.fabricator)
		.pipe(sourcemaps.init())
		.pipe(sass().on('error', sass.logError))
		.pipe(prefix('last 1 version'))
		.pipe(gulpif(!config.dev, csso()))
		.pipe(rename('f.css'))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest(config.dest + '/assets/fabricator/styles'))
		.pipe(gulpif(config.dev, reload({stream:true})));
});

gulp.task('styles:toolkit', function () {
	gulp.src([config.src.styles.toolkit,config.src.styles.production])
		.pipe(sourcemaps.init())
		.pipe(sass().on('error', sass.logError))
		.pipe(prefix('last 3 versions'))
		.pipe(gulpif(!config.dev, csso()))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest(config.dest + '/assets/toolkit/styles'))
		.pipe(gulpif(config.dev, reload({stream:true})));
});

gulp.task('fonts:toolkit', function () {
	gulp.src(config.src.fonts.toolkit)
		.pipe(gulp.dest(config.dest + '/assets/toolkit/fonts'))
});

gulp.task('styles', ['styles:fabricator', 'styles:toolkit']);

gulp.task('fonts', ['fonts:toolkit']);


// scripts
gulp.task('scripts', function (done) {
	webpackCompiler.run(function (error, result) {
		if (error) {
			gutil.log(gutil.colors.red(error));
		}
		result = result.toJson();
		if (result.errors.length) {
			result.errors.forEach(function (error) {
				gutil.log(gutil.colors.red(error));
			});
		}
		done();
	});
});

// images
gulp.task('images', ['favicon'], function () {
	return gulp.src(config.src.images)
		.pipe(imagemin())
		.pipe(gulp.dest(config.dest + '/assets/toolkit/images'));
});

gulp.task('favicon', function () {
	return gulp.src('./src/favicon.ico')
		.pipe(gulp.dest(config.dest));
});

gulp.task('svgs', function () {
	return gulp.src(config.src.svgs)
		.pipe(svgmin())
		.pipe(symbols({
			templates : [
				'src/assets/fabricator/symbols/symbols.html',
				'src/assets/fabricator/symbols/symbols-preview.html',
				'src/assets/fabricator/symbols/symbols.css',
				'default-svg'//,
				//'default-css',
				//'default-demo'
			]
		}))
		.pipe(gulpif( /symbols.html$/, gulp.dest('src/views/layouts/includes')))
		.pipe(gulpif( /symbols-preview.html$/, gulp.dest('src/materials/symbols')))
		.pipe(gulpif( /[.]css$/, gulp.dest(config.dest + '/assets/toolkit/styles')))
		.pipe(gulpif( /[.]svg$/, gulp.dest(config.dest + '/assets/toolkit/images')));
});

// assemble
gulp.task('assemble', ['sass-data'], function (done) {
	assemble({
		helpers: helpers,
		logErrors: config.dev
	});
	done();
});


// server
gulp.task('serve', function () {

	browserSync({
		server: {
			baseDir: config.dest
		},
		notify: false,
		logPrefix: 'FABRICATOR'
	});

	/**
	 * Because webpackCompiler.watch() isn't being used
	 * manually remove the changed file path from the cache
	 */
	function webpackCache(e) {
		var keys = Object.keys(webpackConfig.cache);
		var key, matchedKey;
		for (var keyIndex = 0; keyIndex < keys.length; keyIndex++) {
			key = keys[keyIndex];
			if (key.indexOf(e.path) !== -1) {
				matchedKey = key;
				break;
			}
		}
		if (matchedKey) {
			delete webpackConfig.cache[matchedKey];
		}
	}

	gulp.task('assemble:watch', ['assemble'], reload);
	gulp.watch('src/**/*.{html,md,json,yml}', ['assemble:watch']);

	gulp.task('styles:fabricator:watch', ['styles:fabricator']);
	gulp.watch('src/assets/fabricator/styles/**/*.sass', ['styles:fabricator:watch']);

	gulp.task('styles:toolkit:watch', ['styles:toolkit']);
	gulp.watch('src/assets/toolkit/styles/**/*.sass', ['styles:toolkit:watch']);

	gulp.task('fonts:toolkit:watch', ['fonts:toolkit']);
	gulp.watch('src/assets/toolkit/fonts/**/*', ['fonts:toolkit:watch']);

	gulp.task('scripts:watch', ['scripts'], reload);
	gulp.watch('src/assets/{fabricator,toolkit}/scripts/**/*.js', ['scripts:watch']).on('change', webpackCache);

	gulp.task('svgs:watch', ['svgs'], reload);
	gulp.watch('src/assets/toolkit/svgs/**/*.svg', ['svgs:watch']);

	gulp.task('images:watch', ['images']);
	gulp.watch(config.src.images, ['images:watch']);

	gulp.task('sass-data:watch', ['sass-data']);
	gulp.watch('src/assets/toolkit/styles/variables/**/*.{sass,scss}', ['sass-data:watch']);
});


// default build task
gulp.task('default', ['clean'], function () {

	// define build tasks
	var tasks = [
		'styles',
		'scripts',
		'images',
		'svgs',
		'fonts',
		'sass-data',
		'assemble'
	];

	// run build
	runSequence(tasks, function () {
		if (config.dev) {
			gulp.start('serve');
		}
	});

});
