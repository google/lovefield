'use strict';
var path = require('path');
var os = require('os');
var tmpdir = os.tmpdir();
var uuid = require('uuid');

module.exports = function (ext) {
	return path.join(tmpdir, uuid.v4() + (ext || ''));
};
