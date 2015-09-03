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
goog.provide('lf.service');
goog.provide('lf.service.ServiceId');

goog.forwardDeclare('lf.BackStore');
goog.forwardDeclare('lf.ObserverRegistry');
goog.forwardDeclare('lf.cache.Cache');
goog.forwardDeclare('lf.index.IndexStore');
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


/**
 * The backing data store used by this connection.
 * @const {!lf.service.ServiceId<!lf.BackStore>}
 */
lf.service.BACK_STORE = new lf.service.ServiceId('backstore');


/**
 * The shared row cache used by this connection.
 * @const {!lf.service.ServiceId<!lf.cache.Cache>}
 */
lf.service.CACHE = new lf.service.ServiceId('cache');


/**
 * The shared store of all indices defined.
 * @const {!lf.service.ServiceId<!lf.index.IndexStore>}
 */
lf.service.INDEX_STORE = new lf.service.ServiceId('indexstore');


/**
 * Query engine used for generating execution plan.
 * @const {!lf.service.ServiceId<!lf.proc.QueryEngine>}
 */
lf.service.QUERY_ENGINE = new lf.service.ServiceId('engine');


/**
 * Query runner which executes transactions.
 * @const {!lf.service.ServiceId<!lf.proc.Runner>}
 */
lf.service.RUNNER = new lf.service.ServiceId('runner');


/**
 * Observer registry storing all observing queries.
 * @const {!lf.service.ServiceId<!lf.ObserverRegistry>}
 */
lf.service.OBSERVER_REGISTRY = new lf.service.ServiceId('observerregistry');


/**
 * Finalized schema associated with this connection.
 * @const {!lf.service.ServiceId<!lf.schema.Database>}
 */
lf.service.SCHEMA = new lf.service.ServiceId('schema');
