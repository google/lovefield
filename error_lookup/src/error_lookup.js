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


/**
 * Translates CGI params into human readable error messages, if applicable.
 * For example, ?c=107&p0=1&p1=3 will maps to error code 107, and two extra
 * parameters 1 and 3 will be used to generate the final message.
 * @param {!Object} data Error messages indexed by error code.
 * @return {?string}
 */
function getMessage(data) {
  var params = window.location.search.slice(1).split('&');
  var input = {};

  params.forEach(function(raw) {
    var tokens = raw.split('=');
    if (tokens.length == 2) {
      input[tokens[0]] = tokens[1];
    }
  });

  if (input.hasOwnProperty('c') && data.hasOwnProperty(input['c'])) {
    var category;
    var code;
    try {
      code = parseInt(input['c'], 10);
      category = data[(Math.floor(code / 100) * 100).toString()];
    } catch (e) {
      return null;
    }

    var message = data[code.toString()];
    if (category && message &&
        typeof(category) == 'string' && typeof(message) == 'string') {
      message = category + ': (' + code.toString() + ') ' + message;
      return message.replace(/{([^}]+)}/g, function(match, pattern) {
        return input['p' + pattern] || '';
      });
    }
  }
  return null;
}


/**
 * @param {!Object} data
 * @return {string}
 */
function formatJson(data) {
  var results = ['<pre>'];
  for (key in data) {
    results.push(key + ': ' + data[key]);
  }
  results.push('</pre>');
  return results.join('\n');
}

$(function() {
  $.getJSON('../lib/error_code.json').then(function(data) {
    var message = getMessage(data);
    if (message && message.length) {
      $('#message').append(message);
    } else {
      $('#message').append(formatJson(data));
    }
  });
});
