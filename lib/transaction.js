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
 * Executes a list of queries and commits the transaction.
 * @param {!Array<!lf.query.Builder>} queries
 * @return {!IThenable}
 */
lf.Transaction.prototype.exec;


/**
 * @param {!Array<!lf.schema.Table>} scope The tables that this transaction will
 *     be allowed to access. An exclusive lock will be obtained on all tables
 *     before any queries belonging to this transaction can be served.
 * @return {!IThenable} A promise fulfilled when all required locks have been
 *     acquired.
 */
lf.Transaction.prototype.begin;


/**
 * @param {!lf.query.Builder} query The query to be attached to this
 *     transaction.
 * @return {!IThenable}
 */
lf.Transaction.prototype.attach;


/**
 * Commits this transactions. Any queries that were performed will be flushed to
 * disk.
 * @return {!IThenable}
 */
lf.Transaction.prototype.commit;


/**
 * Rolls back all changes that were made within this transaction. Rollback is
 * only allowed if the transaction has not been yet committed.
 * @return {!IThenable}
 */
lf.Transaction.prototype.rollback;
