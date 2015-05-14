/**
 * @license
 * Copyright 2015 The Lovefield Project Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var streamMod = require('stream');
var utilMod = require('util');
var bufferMod = require('buffer');



/**
 * @constructor
 *
 * @param {!Object} options
 */
var StripLicense = function(options) {
  streamMod.Transform.call(this, options);
};
utilMod.inherits(StripLicense, streamMod.Transform);


/**
 * @param {{contents: !Object}} file
 * @param {string} enc
 * @param {!Function} callback
 */
StripLicense.prototype._transform = function(file, enc, callback) {
  var inputContents = file.contents.toString();
  var outputContents = this.stripLicense_(inputContents);
  file.contents = new bufferMod.Buffer(outputContents);
  callback(null, file);
};


/**
 * Strips redundant license declarations and keeps only one at the beginning.
 * @param {string} input The input that contains multiple License declarations.
 * @return {string}
 * @private
 */
StripLicense.prototype.stripLicense_ = function(input) {
  var stripped = input.replace(
      /(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s;])+\/\/(?:.*)$)/gm, '');
  var LICENSE = [
    '/*',
    '  Copyright 2014 The Lovefield Project Authors. All Rights Reserved.',
    '',
    '  Licensed under the Apache License, Version 2.0 (the "License");',
    '  you may not use this file except in compliance with the License.',
    '  You may obtain a copy of the License at',
    '',
    '  http://www.apache.org/licenses/LICENSE-2.0',
    '',
    '  Unless required by applicable law or agreed to in writing, software',
    '  distributed under the License is distributed on an "AS IS" BASIS,',
    '  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or' +
        ' implied.',
    '  See the License for the specific language governing permissions and',
    '  limitations under the License.',
    '*/',
    ''
  ].join('\n');
  return LICENSE + stripped;
};


/** @type {!Function} */
exports.StripLicense = StripLicense;
