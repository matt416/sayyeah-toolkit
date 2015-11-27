'use strict';

/**
 * Global `viewport` object
 * @namespace
 */
var viewport = window.viewport = {};


/**
 * Default options
 * @type {Object}
 */
viewport.options = {
	viewportSize : 'lg'
};

// open menu by default if large screen
// viewport.options.menu = window.matchMedia(viewport.options.mq).matches;

/**
 * Feature detection
 * @type {Object}
 */
viewport.test = {};

// test for sessionStorage
viewport.test.sessionStorage = (function () {
	var test = '_f';
	try {
		sessionStorage.setItem(test, test);
		sessionStorage.removeItem(test);
		return true;
	} catch(e) {
		return false;
	}
}());

// create storage object if it doesn't exist; store options
if (viewport.test.sessionStorage) {
	sessionStorage.viewport = sessionStorage.viewport || JSON.stringify(viewport.options);
}


/**
 * Cache DOM
 * @type {Object}
 */
viewport.dom = {
	root: document.querySelector('html'),
	controls: document.querySelectorAll('[data-viewport]')
};


/**
 * Get current option values from session storage
 * @return {Object}
 */
viewport.getOptions = function () {
	return (viewport.test.sessionStorage) ? JSON.parse(sessionStorage.viewport) : viewport.options;
};




viewport.initViewport = function () {

	var options = viewport.getOptions()

	document.querySelector('body').classList.add(options.viewportSize)
	if (document.querySelector('[data-viewport='+options.viewportSize+']')) document.querySelector('[data-viewport='+options.viewportSize+']').classList.add('active')

	// var bodyClasses = document.querySelector('body').classList.toString();

	// var viewportSizes = ['xs','sm','md','lg','xl']
	
	// var getCurrentViewport = function(){
	// 	for (var i = 0; i < viewportSizes.length; i++){

	// 		if (bodyViewport.indexOf(viewportSizes[i]) > -1){
	// 			return viewportSizes[i]
	// 		}

	// 	}
	// 	return false;
	// }

	// var currentViewport = getCurrentViewport()
	
	// viewport.dom.root.querySelector('[data-viewport='+currentViewport+']').classList.add('active')

	return this;
};

viewport.viewportToggle = function () {

	// toggle single
	var toggleViewport = function (e) {
		//var group = this.parentNode.parentNode.parentNode,
		var el = e.currentTarget

		var currentSelection = el.parentNode.querySelector('.active')
		


		if (currentSelection) currentSelection.classList.remove('active')
		el.classList.add('active')


		var type = el.getAttribute('data-viewport');

		var viewports = document.querySelectorAll('.viewport');

		document.querySelector('body').classList.remove('xs','sm','md','lg','xl')
		document.querySelector('body').classList.add(type)

		viewport.options.viewportSize = type

		if (viewport.test.sessionStorage) {
			sessionStorage.setItem('viewport', JSON.stringify(viewport.options));
		}



	};

	for (var i = 0; i < viewport.dom.controls.length; i++) {

		viewport.dom.controls[i].addEventListener('click', toggleViewport);
	}

	return this;

};


/**
 * Initialization
 */
(function () {
	viewport
		.initViewport()
		.viewportToggle()
}());
