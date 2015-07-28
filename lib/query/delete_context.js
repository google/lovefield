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
goog.provide('lf.query.DeleteContext');

goog.require('lf.query.Context');
goog.require('lf.structs.set');



/**
 * Internal representation of a DELETE query.
 * @struct
 * @constructor
 * @extends {lf.query.Context}
 *
 * @param {!lf.schema.Database} schema
 */
lf.query.DeleteContext = function(schema) {
  lf.query.DeleteContext.base(this, 'constructor', schema);

  /** @type {!lf.schema.Table} */
  this.from;
};
goog.inherits(lf.query.DeleteContext, lf.query.Context);


/** @override */
lf.query.DeleteContext.prototype.getScope = function() {
  var scope = lf.structs.set.create();
  scope.add(this.from);
  this.schema.info().getChildTables(this.from.getName()).forEach(
      scope.add.bind(scope));
  return scope;
};


/** @override */
lf.query.DeleteContext.prototype.clone = function() {
  var context = new lf.query.DeleteContext(this.schema);
  context.cloneBase(this);
  context.from = this.from;
  return context;
};


/** @override */
lf.query.DeleteContext.prototype.bind = function(values) {
  lf.query.DeleteContext.base(this, 'bind', values);

  this.bindValuesInSearchCondition(values);
  return this;
};
