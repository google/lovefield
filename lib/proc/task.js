/**
 * @license
 * Copyright 2014 The Lovefield Project Authors. All Rights Reserved.
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
goog.provide('lf.proc.TaskItem');
goog.provide('lf.proc.TaskPriority');



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
 * @return {!lf.structs.Set<!lf.schema.Table>}
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


/**
 * The priority of this task.
 * @return {!lf.proc.TaskPriority}
 */
lf.proc.Task.prototype.getPriority;


/**
 * The priority of each type of task. Lower number means higher priority.
 * @enum {number}
 */
lf.proc.TaskPriority = {
  OBSERVER_QUERY_TASK: 0,
  EXTERNAL_CHANGE_TASK: 1,
  USER_QUERY_TASK: 2,
  TRANSACTION_TASK: 2
};


/**
 * @typedef {{
 *   context: !lf.query.Context,
 *   plan: !lf.proc.PhysicalQueryPlan
 * }}
 */
lf.proc.TaskItem;
