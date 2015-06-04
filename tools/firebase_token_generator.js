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
 *
 *
 * @fileoverview Generates auth token for firebase clients.
 */

var nopt = /** @type {!Function} */ (require('nopt'));



/** @constructor */
var FirebaseTokenGenerator = /** @type {!Function} */ (
    require('firebase-token-generator'));

function main() {
  var knownOpts = {
    'token': [String],
    'uid': [String, null],
    'expiration': [Number, null],
    'admin': [Boolean, null]
  };
  var options = nopt(knownOpts);
  if (options.token.length < 40) {
    console['log']('Invalid secret token');
    return;
  }

  var userId = options.uid || 'custom:1';

  // By default, generate a token that expires in a day.
  var defaultExpiration = (new Date()).getTime() + 86400;

  var expiration = options.expiration || defaultExpiration;
  var isAdmin = options.admin || true;
  var tokenGenerator = /** @type {{createToken: !Function}} */ (
      new FirebaseTokenGenerator(options.token));
  var token = tokenGenerator.createToken(
      { uid: userId },
      { expires: expiration, admin: isAdmin });
  console['log'](token);
}

main();
