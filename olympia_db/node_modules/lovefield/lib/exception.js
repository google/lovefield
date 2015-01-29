/**
 * @license
 * Copyright 2014 Google Inc. All Rights Reserved.
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
goog.provide('lf.Exception');



/**
 * @param {string} name
 * @param {string} message
 * @constructor
 * @struct
 */
lf.Exception = function(name, message) {
  /** @type {string} */
  this.name = name;

  /** @type {string} */
  this.message = message;
};


/** @enum {string} */
lf.Exception.Type = {
  BLOCKING: 'BlockingError',
  CONSTRAINT: 'ConstraintError',
  CONTEXT: 'ContextError',
  DATA: 'DataError',
  NOT_FOUND: 'NotFoundError',
  NOT_SUPPORTED: 'NotSupportedError',
  QUOTA_EXCEEDED: 'QuotaExceededError',
  SYNTAX: 'SyntaxError',
  SCOPE_ERROR: 'ScopeError',
  TIMEOUT: 'TimeoutError',
  TOO_MANY_ROWS: 'TooManyRowsError',
  TRANSACTION: 'TransactionError',
  UNKNOWN: 'UnknownError',
  UNINITIALIZED: 'UninitializedError',
  VERSION: 'VersionError'
};
