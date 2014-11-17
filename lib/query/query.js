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
goog.provide('lf.query');

goog.require('lf.Global');
goog.require('lf.service');


/**
 * Registers an observer for the given query.
 * @param {!lf.query.SelectContext} query The query to be observed.
 * @param {!Function} callback The callback to be called whenever the results of
 *     the given query are modified.
 */
lf.query.observe = function(query, callback) {
  var observerRegistry = lf.Global.get().getService(
      lf.service.OBSERVER_REGISTRY);
  observerRegistry.addObserver(query, callback);
};


/**
 * Unregisters an observer for the given query.
 * @param {!lf.query.SelectContext} query The query to be unobserved.
 * @param {!Function} callback The callback to be unregistered.
 */
lf.query.unobserve = function(query, callback) {
  var observerRegistry = lf.Global.get().getService(
      lf.service.OBSERVER_REGISTRY);
  observerRegistry.removeObserver(query, callback);
};
