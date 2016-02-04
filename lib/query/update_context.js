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
goog.provide('lf.query.UpdateContext');
goog.provide('lf.query.UpdateContext.Set');

goog.require('lf.query.Context');
goog.require('lf.structs.set');



/**
 * Internal representation of an UPDATE query.
 * @struct
 * @constructor
 * @extends {lf.query.Context}
 * @param {!lf.schema.Database} schema
 */
lf.query.UpdateContext = function(schema) {
  lf.query.UpdateContext.base(this, 'constructor', schema);

  /** @type {!lf.schema.Table} */
  this.table;

  /** @type {!Array<!lf.query.UpdateContext.Set>} */
  this.set;
};
goog.inherits(lf.query.UpdateContext, lf.query.Context);


/**
 * @typedef {{
 *     binding: number,
 *     column: !lf.schema.Column,
 *     value: *}}
 */
lf.query.UpdateContext.Set;


/** @override */
lf.query.UpdateContext.prototype.getScope = function() {
  var scope = lf.structs.set.create();
  scope.add(this.table);
  var columns = this.set.map(function(col) {
    return col.column.getNormalizedName();
  });
  var info = this.schema.info();
  info.getParentTablesByColumns(columns).forEach(scope.add.bind(scope));
  info.getChildTablesByColumns(columns).forEach(scope.add.bind(scope));
  return scope;
};


/** @override */
lf.query.UpdateContext.prototype.clone = function() {
  var context = new lf.query.UpdateContext(this.schema);
  context.cloneBase(this);
  context.table = this.table;
  context.set = this.set ?
      lf.query.UpdateContext.cloneSet_(this.set) : this.set;
  return context;
};


/** @override */
lf.query.UpdateContext.prototype.bind = function(values) {
  lf.query.UpdateContext.base(this, 'bind', values);

  this.set.forEach(function(set) {
    if (set.binding != -1) {
      set.value = values[set.binding];
    }
  });
  this.bindValuesInSearchCondition(values);
  return this;
};


/**
 * @param {!Array<!lf.query.UpdateContext.Set>} set
 * @return {!Array<!lf.query.UpdateContext.Set>}
 * @private
 */
lf.query.UpdateContext.cloneSet_ = function(set) {
  return set.map(function(src) {
    var dst = {};
    for (var key in src) {
      dst[key] = src[key];
    }
    return dst;
  });
};
