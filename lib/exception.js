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
  // Context is already in use and cannot be reused. For example, attempt to
  // start observer twice.
  BLOCKING: 'BlockingError',

  // Constraints specified in schema are violated.
  CONSTRAINT: 'ConstraintError',

  // Data provided to an operation does not meet requirements.
  DATA: 'DataError',

  // Specified name not found.
  NOT_FOUND: 'NotFoundError',

  // The feature is not supported/implemented yet.
  NOT_SUPPORTED: 'NotSupportedError',

  // The operation failed because there was not enough remaining storage space,
  // or the storage quota was reached and the user declined to give more space
  // to the database.
  QUOTA_EXCEEDED: 'QuotaExceededError',

  // Invalid syntax. For example, calling from() twice.
  SYNTAX: 'SyntaxError',

  // Scope violation: attempt to access outside of specified scope. For example,
  // accessing table not specified in transaction.begin().
  SCOPE_ERROR: 'ScopeError',

  // Operation time out. (Reserved, not used in Lovefield yet.)
  TIMEOUT: 'TimeoutError',

  // The index structure (B+ Tree) is not capable of handling so many rows
  // (current limitation is 2^27 = 134217728 rows).
  TOO_MANY_ROWS: 'TooManyRowsError',

  // Transaction is in an invalid state.
  TRANSACTION: 'TransactionError',

  // Unknown error.
  UNKNOWN: 'UnknownError',

  // The database connection has not initialized yet.
  UNINITIALIZED: 'UninitializedError',

  // Lovefield library version mismatch.
  VERSION: 'VersionError'
};
