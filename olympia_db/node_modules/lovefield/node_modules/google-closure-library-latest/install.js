'use strict';

var path = require('path');
var download = require('download');

var closureToolsUrls = 'https://github.com/google/closure-library/archive/master.zip';
var downloadDir = path.join(__dirname, 'lib');

var closureToolsDownload = download(closureToolsUrls, downloadDir, { extract: true , strip: 1});

closureToolsDownload.on('error', function(err){
	if (err) {
		throw new Error('Failed to download "' + closureToolsUrls + '"!\n' + err);
	}
});
closureToolsDownload.on('close', function(){
	console.log('Successfully downloaded "' + closureToolsUrls + '" to:\n    ' + downloadDir);
});