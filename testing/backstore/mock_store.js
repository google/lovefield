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
goog.provide('lf.testing.backstore.MockStore');

goog.require('lf.BackStore');
goog.require('lf.testing.backstore.TrackedTx');



/**
 * An lf.backstore.Memory wrapper to be used for simulating external changes.
 *
 * An external change is a modification of the backing store that has already
 * occurred
 *  - via a different tab/window for the case of a local DB (like IndexedDB), or
 *  - via a different client for the case of a remote DB (like Firebase).
 *
 *  MockStore is a wrapper around the actual backstore (the one registered in
 *  lf.Global). MockStore itself is not registered in lf.Global. Changes
 *  submitted through MockStore will result in
 *
 *  1) Modifying the actual backstore data.
 *  2) Notifying observers of the actual backstore, giving them a chance to
 *     update Lovefield's internal state (in-memory indices/caches) accordingly.
 *
 * @implements {lf.BackStore}
 * @constructor @struct
 *
 * @param {!lf.backstore.ObservableStore} store The memory backing store
 *     to be wrapped.
 */
lf.testing.backstore.MockStore = function(store) {
  /** @private {!lf.backstore.ObservableStore} */
  this.store_ = store;
};


/** @override */
lf.testing.backstore.MockStore.prototype.init = function(opt_onUpgrade) {
  return this.store_.init(opt_onUpgrade);
};


/** @override */
lf.testing.backstore.MockStore.prototype.getTableInternal =
    function(tableName) {
  return this.store_.getTableInternal(tableName);
};


/** @override */
lf.testing.backstore.MockStore.prototype.createTx = function(
    mode, scope, opt_journal) {
  return new lf.testing.backstore.TrackedTx(this, mode, opt_journal);
};


/** @override */
lf.testing.backstore.MockStore.prototype.close = function() {
};


/** @override */
lf.testing.backstore.MockStore.prototype.subscribe = goog.abstractMethod;


/** @override */
lf.testing.backstore.MockStore.prototype.unsubscribe = goog.abstractMethod;


/** @override */
lf.testing.backstore.MockStore.prototype.notify = function(changes) {
  this.store_.notify(changes);
};
