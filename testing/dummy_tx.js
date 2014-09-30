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
goog.provide('lf.testing.backstore.DummyTx');

goog.require('lf.backstore.MemoryTable');
goog.require('lf.backstore.Tx');
goog.require('lf.cache.Journal');



/**
 * A dummy transaction object to be used for tests.
 * @implements {lf.backstore.Tx}
 * @constructor @struct
 * @final
 */
lf.testing.backstore.DummyTx = function() {};


/** @override */
lf.testing.backstore.DummyTx.prototype.getTable = function() {
  return new lf.backstore.MemoryTable();
};


/** @override */
lf.testing.backstore.DummyTx.prototype.getJournal = function() {
  return new lf.cache.Journal();
};


/** @override */
lf.testing.backstore.DummyTx.prototype.finished = function() {
  return Promise.resolve();
};


/** @override */
lf.testing.backstore.DummyTx.prototype.commit = function() {};


/** @override */
lf.testing.backstore.DummyTx.prototype.abort = function() {};
