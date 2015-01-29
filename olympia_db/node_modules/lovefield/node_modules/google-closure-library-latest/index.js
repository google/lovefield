'use strict';

var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var ncp = require('ncp');

var downloadDir = path.join(__dirname, 'bin');

module.exports = function(installDir) {
	if (!fs.existsSync(installDir)) {
		mkdirp(installDir);
	}
	
	if (fs.existsSync(installDir) && fs.statSync(installDir).isDirectory()) {
		ncp(downloadDir, installDir, function(err) {
			if(err){throw new Error('Failed to install the latest version of the Google Closure library to the folder: ' + installDir + '.\nError: ' + err);}
		});
	} else {
		throw new Error('Installation directory not found and could not be created.');
	}
};