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
goog.provide('lf.backstore.ExternalChangeObserver');

goog.require('lf.proc.ExternalChangeTask');
goog.require('lf.service');



/**
 * @constructor
 * @struct
 *
 * @param {!lf.Global} global
 */
lf.backstore.ExternalChangeObserver = function(global) {
  /** @private {!lf.Global} */
  this.global_ = global;

  /** @private {!lf.BackStore} */
  this.backStore_ = global.getService(lf.service.BACK_STORE);

  /** @private {!lf.proc.Runner} */
  this.runner_ = global.getService(lf.service.RUNNER);
};


/**
 * Starts observing the backing store for any external changes.
 */
lf.backstore.ExternalChangeObserver.prototype.startObserving =
    function() {
  this.backStore_.subscribe(this.onChange_.bind(this));
};


/**
 * Stops observing the backing store.
 */
lf.backstore.ExternalChangeObserver.prototype.stopObserving = function() {
  this.backStore_.unsubscribe();
};


/**
 * Executes every time a change is reported by the backing store. It is
 * responsible for schudeling a task that will updated the in-memory data layers
 * (indices and cache) accordingly.
 * @param {!Array<!lf.cache.TableDiff>} tableDiffs
 * @private
 */
lf.backstore.ExternalChangeObserver.prototype.onChange_ = function(tableDiffs) {
  // Note: Current logic does not check for any conflicts between external
  // changes and in-flight READ_WRITE queries. It assumes that no conflicts
  // exist (single writer, multiple readers model).
  var externalChangeTask = new lf.proc.ExternalChangeTask(
      this.global_, tableDiffs);
  this.runner_.scheduleTask(externalChangeTask);
};
