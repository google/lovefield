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
goog.provide('lf.Database');



/**
 * Models the return value of getInstance().
 * @interface
 */
lf.Database = function() {};


/** @return {!lf.schema.Database} */
lf.Database.prototype.getSchema;


/**
 * @param {...lf.schema.Column} var_args
 * @return {!lf.query.Select}
 */
lf.Database.prototype.select;


/** @return {!lf.query.Insert} */
lf.Database.prototype.insert;


/** @return {!lf.query.Insert} */
lf.Database.prototype.insertOrReplace;


/**
 * @param {!lf.schema.Table} table
 * @return {!lf.query.Update}
 */
lf.Database.prototype.update;


/** @return {!lf.query.Delete} */
lf.Database.prototype.delete;


/**
 * @param {lf.TransactionType=} opt_type
 * @return {!lf.Transaction}
 */
lf.Database.prototype.createTransaction;


/**
 * Closes database connection. This is a best effort function and the closing
 * can happen in a separate thread.
 * Once a db is closed, all its queries will fail and cannot be reused.
 */
lf.Database.prototype.close;
