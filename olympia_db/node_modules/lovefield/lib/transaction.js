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
goog.provide('lf.Transaction');
goog.provide('lf.TransactionType');

goog.forwardDeclare('lf.query.Builder');


/** @enum {number} */
lf.TransactionType = {
  READ_ONLY: 0,
  READ_WRITE: 1
};



/** @interface */
lf.Transaction = function() {};


/**
 * @param {!Array.<!lf.query.Builder>} queries
 * @return {!IThenable}
 */
lf.Transaction.prototype.exec;
