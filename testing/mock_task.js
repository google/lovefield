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
goog.provide('lf.testing.MockTask');

goog.require('goog.Promise');
goog.require('lf.proc.Task');



/**
 * @implements {lf.proc.Task}
 * @constructor
 * @struct
 *
 * @param {!lf.TransactionType} txType
 * @param {!goog.structs.Set<!lf.schema.Table>} scope
 * @param {!Function} execFn The function to call when this task is executed.
 * @param {!lf.proc.TaskPriority} priority The priority of this task.
 */
lf.testing.MockTask = function(txType, scope, execFn, priority) {
  /** @private {!lf.TransactionType} */
  this.txType_ = txType;

  /** @private {!goog.structs.Set<!lf.schema.Table>} */
  this.scope_ = scope;

  /** @private {!Function} */
  this.execFn_ = execFn;

  /** @private {!lf.proc.TaskPriority} */
  this.priority_ = priority;

  /** @private {!goog.promise.Resolver.<!Array<!lf.proc.Relation>>} */
  this.resolver_ = goog.Promise.withResolver();
};


/** @override */
lf.testing.MockTask.prototype.getType = function() {
  return this.txType_;
};


/** @override */
lf.testing.MockTask.prototype.getScope = function() {
  return this.scope_;
};


/** @override */
lf.testing.MockTask.prototype.getResolver = function() {
  return this.resolver_;
};


/** @override */
lf.testing.MockTask.prototype.getId = function() {
  return goog.getUid(this);
};


/** @override */
lf.testing.MockTask.prototype.getPriority = function() {
  return this.priority_;
};


/** @override */
lf.testing.MockTask.prototype.exec = function() {
  return new goog.Promise(goog.bind(
      function(resolve, reject) {
        return resolve(this.execFn_());
      }, this));
};
