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
var sftp = require('gulp-sftp');
var insert = require('gulp-insert');
var dss = require('gulp-dss');

// Local Modules
var helpers = require('../helpers'); // Extra Handlebars Helpers

// configuration
var config = {
	dev: gutil.env.dev,
	user: gutil.env.user || 'sayyeah',
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

		svgs : [
		{	'name' : 'resources',
			'path' : 'src/assets/toolkit/svgs/resources/*.svg' },
		{	'name' : 'clients',
			'path' : 'src/assets/toolkit/svgs/clients/*.svg' },
		{	'name' : 'publications',
			'path' : 'src/assets/toolkit/svgs/publications/*.svg' },
		{	'name' : 'global',
			'path' : 'src/assets/toolkit/svgs/global/*.svg'	}],		

		views: 'src/toolkit/views/*.html'
	},

	dest: 'dist'
};


// webpack
var webpackConfig = require('./webpack.config')(config);
var webpackCompiler = webpack(webpackConfig);

gulp.task('dss', function(){

	return gulp.src('src/assets/toolkit/styles/style.sass')
		.pipe(dss({
			output: 'index.html',
      		templatePath: path.join(__dirname, 'templates')
		}))
		.pipe(gulp.dest('src'))
})

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
	for(var i = 0; i < config.src.svgs.length; i++) {
		gulp.src(config.src.svgs[i].path)
			.pipe(svgmin())
			.pipe(symbols({
				templates : [
					'src/assets/fabricator/symbols/symbols.html',
					'src/assets/fabricator/symbols/symbols-preview.html',
					'src/assets/fabricator/symbols/_symbols.sass',
					'default-svg'
				]
			}))
			.pipe(gulpif( 'symbols.html', rename( 'symbols-' + config.src.svgs[i].name +'.html' )))
			.pipe(gulpif( 'symbols-' + config.src.svgs[i].name +'.html', gulp.dest('src/views/layouts/includes')))
			
			.pipe(gulpif( 'symbols-preview.html', insert.prepend( '{{>symbols-' + config.src.svgs[i].name + '}}' )))
			.pipe(gulpif( 'symbols-preview.html', rename(config.src.svgs[i].name +'.html')))
			.pipe(gulpif( config.src.svgs[i].name +'.html', gulp.dest('src/materials/symbols')))

			.pipe(gulpif( /[.]sass$/, rename('_symbols-' + config.src.svgs[i].name +'.sass')))
			.pipe(gulpif( /[.]sass$/, gulp.dest('src/assets/toolkit/styles/variables')))

			.pipe(gulpif( /[.]svg$/, rename(config.src.svgs[i].name +'.svg')))
			.pipe(gulpif( /[.]svg$/, gulp.dest(config.dest + '/assets/toolkit/images')));
	};

	return;

});

// assemble
gulp.task('assemble', function (done) {
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


// Transfer the stylesheet to the stage server for testing
gulp.task('sftp', function () {
    return gulp.src('dist/assets/toolkit/**/*')
        .pipe(sftp({
            host: '104.236.0.23',
            user: 'sayyeah',
            port: '9324',
            remotePath: '/var/www/sayyeah-dev/assets'
        }));
});


// Transfer the stylesheet to the stage server for testing
gulp.task('run:deploy', function () {
    return gulp.src('dist/**/*')
        .pipe(sftp({
            host: '104.236.0.23',
            user: config.user,
            port: '9324',
            remotePath: '/var/www/sayyeah-styleguide'
        }));
});


// default build task
gulp.task('default', ['clean'], function () {

	// define build tasks
	var tasks = [
		'styles',
		'scripts',
		'images',
		'svgs',
		'fonts'		
	];

	// run build
	runSequence(tasks, 'sass-data', 'assemble', function () {
		if (config.dev) {
			gulp.start('serve');
		}
	});

});

gulp.task('deploy', ['clean'], function(){
	var tasks = [
		'styles',
		'scripts',
		'images',
		'svgs',
		'fonts'		
	];

	// run build
	runSequence(tasks, 'sass-data', 'assemble', 'run:deploy', function () {
		
	});
})

gulp.task('sync', function(){
	runSequence('sftp', function(){

	})
})
