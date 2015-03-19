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
goog.provide('lf.proc.Task');



/**
 * @interface
 */
lf.proc.Task = function() {};


/**
 * Executes this task.
 * @return {!IThenable<!Array<!lf.proc.Relation>>}
 */
lf.proc.Task.prototype.exec;


/**
 * @return {!lf.TransactionType}
 */
lf.proc.Task.prototype.getType;


/**
 * The tables that this task refers to.
 * @return {!goog.structs.Set<!lf.schema.Table>}
 */
lf.proc.Task.prototype.getScope;


/**
 * @return {!goog.promise.Resolver.<!Array<!lf.proc.Relation>>}
 */
lf.proc.Task.prototype.getResolver;


/**
 * A unique identifier for this task.
 * @return {number}
 */
lf.proc.Task.prototype.getId;
