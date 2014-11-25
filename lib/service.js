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
goog.provide('lf.service');
goog.provide('lf.service.ServiceId');

goog.forwardDeclare('lf.BackStore');
goog.forwardDeclare('lf.ObserverRegistry');
goog.forwardDeclare('lf.cache.Cache');
goog.forwardDeclare('lf.index.IndexStore');
goog.forwardDeclare('lf.eval.Registry');
goog.forwardDeclare('lf.proc.QueryEngine');
goog.forwardDeclare('lf.proc.Runner');
goog.forwardDeclare('lf.schema.Database');



/**
 * Template class used to register services.
 * @param {string} serviceId
 * @template T
 * @constructor @struct @final
 */
lf.service.ServiceId = function(serviceId) {
  /** @private {string} */
  this.serviceId_ = serviceId;
};


/** @override */
lf.service.ServiceId.prototype.toString = function() {
  return this.serviceId_;
};


/** @const {!lf.service.ServiceId.<!lf.BackStore>} */
lf.service.BACK_STORE = new lf.service.ServiceId('backstore');


/** @const {!lf.service.ServiceId.<!lf.cache.Cache>} */
lf.service.CACHE = new lf.service.ServiceId('cache');


/** @const {!lf.service.ServiceId.<!lf.index.IndexStore>} */
lf.service.INDEX_STORE = new lf.service.ServiceId('indexstore');


/** @const {!lf.service.ServiceId.<!lf.proc.QueryEngine>} */
lf.service.QUERY_ENGINE = new lf.service.ServiceId('engine');


/** @const {!lf.service.ServiceId.<!lf.proc.Runner>} */
lf.service.RUNNER = new lf.service.ServiceId('runner');


/** @const {!lf.service.ServiceId.<!lf.eval.Registry>} */
lf.service.EVAL_REGISTRY = new lf.service.ServiceId('evalregistry');


/** @const {!lf.service.ServiceId.<!lf.ObserverRegistry>} */
lf.service.OBSERVER_REGISTRY = new lf.service.ServiceId('observerregistry');


/** @const {!lf.service.ServiceId.<!lf.schema.Database>} */
lf.service.SCHEMA = new lf.service.ServiceId('schema');
