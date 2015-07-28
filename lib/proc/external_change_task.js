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
goog.provide('lf.proc.ExternalChangeTask');

goog.require('goog.Promise');
goog.require('lf.TransactionType');
goog.require('lf.cache.InMemoryUpdater');
goog.require('lf.proc.ObserverQueryTask');
goog.require('lf.proc.Task');
goog.require('lf.proc.TaskPriority');
goog.require('lf.service');
goog.require('lf.structs.set');



/**
 * @implements {lf.proc.Task}
 * @constructor
 * @struct
 *
 * @param {!lf.Global} global
 * @param {!Array<!lf.cache.TableDiff>} tableDiffs
 */
lf.proc.ExternalChangeTask = function(global, tableDiffs) {
  /** @private {!lf.Global} */
  this.global_ = global;

  /** @private {!lf.ObserverRegistry} */
  this.observerRegistry_ = global.getService(lf.service.OBSERVER_REGISTRY);

  /** @private {!lf.proc.Runner} */
  this.runner_ = global.getService(lf.service.RUNNER);

  /** @private {!lf.cache.InMemoryUpdater} */
  this.inMemoryUpdater_ = new lf.cache.InMemoryUpdater(global);

  /** @private {!Array<!lf.cache.TableDiff>} */
  this.tableDiffs_ = tableDiffs;

  var schema = global.getService(lf.service.SCHEMA);
  var tableSchemas = this.tableDiffs_.map(
      function(tableDiff) {
        return schema.table(tableDiff.getName());
      });

  /** @private {!lf.structs.Set<!lf.schema.Table>} */
  this.scope_ = lf.structs.set.create(tableSchemas);

  /** @private {!goog.promise.Resolver.<!Array<!lf.proc.Relation>>} */
  this.resolver_ = goog.Promise.withResolver();
};


/** @override */
lf.proc.ExternalChangeTask.prototype.exec = function() {
  this.inMemoryUpdater_.update(this.tableDiffs_);
  this.scheduleObserverTask_();
  return goog.Promise.resolve();
};


/** @override */
lf.proc.ExternalChangeTask.prototype.getType = function() {
  return lf.TransactionType.READ_WRITE;
};


/** @override */
lf.proc.ExternalChangeTask.prototype.getScope = function() {
  return this.scope_;
};


/** @override */
lf.proc.ExternalChangeTask.prototype.getResolver = function() {
  return this.resolver_;
};


/** @override */
lf.proc.ExternalChangeTask.prototype.getId = function() {
  return goog.getUid(this);
};


/** @override */
lf.proc.ExternalChangeTask.prototype.getPriority = function() {
  return lf.proc.TaskPriority.EXTERNAL_CHANGE_TASK;
};


/**
 * Schedules an ObserverTask for any observed queries that need to be
 * re-executed, if any.
 * @private
 */
lf.proc.ExternalChangeTask.prototype.scheduleObserverTask_ = function() {
  var items = this.observerRegistry_.getTaskItemsForTables(this.scope_);
  if (items.length != 0) {
    var observerTask = new lf.proc.ObserverQueryTask(this.global_, items);
    this.runner_.scheduleTask(observerTask);
  }
};
