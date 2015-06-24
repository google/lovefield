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
goog.provide('lf.backstore.ObservableStore');

goog.require('lf.backstore.Memory');



/**
 * A backing store implementation that holds all data in-memory, without
 * persisting anything to disk, and can be observed. This only makes sense
 * during testing where external changes are simulated on a MemoryDB.
 *
 * @extends {lf.backstore.Memory}
 * @constructor @struct
 *
 * @param {!lf.schema.Database} schema The schema of the database.
 */
lf.backstore.ObservableStore = function(schema) {
  lf.backstore.ObservableStore.base(this, 'constructor', schema);

  /** @private {?function(!Array<!lf.cache.TableDiff>)} */
  this.observer_ = null;
};
goog.inherits(lf.backstore.ObservableStore, lf.backstore.Memory);


/** @override */
lf.backstore.ObservableStore.prototype.subscribe = function(observer) {
  // Currently only one observer is supported.
  if (goog.isNull(this.observer_)) {
    this.observer_ = observer;
  }
};


/** @override */
lf.backstore.ObservableStore.prototype.unsubscribe = function() {
  this.observer_ = null;
};


/** @override */
lf.backstore.ObservableStore.prototype.notify = function(changes) {
  if (!goog.isNull(this.observer_)) {
    this.observer_(changes);
  }
};
