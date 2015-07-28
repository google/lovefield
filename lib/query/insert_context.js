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
goog.provide('lf.query.InsertContext');

goog.require('lf.Binder');
goog.require('lf.query.Context');
goog.require('lf.structs.set');



/**
 * Internal representation of INSERT and INSERT_OR_REPLACE queries.
 * @struct
 * @constructor
 * @extends {lf.query.Context}
 *
 * @param {!lf.schema.Database} schema
 */
lf.query.InsertContext = function(schema) {
  lf.query.InsertContext.base(this, 'constructor', schema);

  /** @type {!lf.schema.Table} */
  this.into;

  /** @type {!lf.Binder|!Array<!lf.Row|!lf.Binder>} */
  this.binder;

  /** @type {!Array<!lf.Row>} */
  this.values;

  /** @type {boolean} */
  this.allowReplace;
};
goog.inherits(lf.query.InsertContext, lf.query.Context);


/** @override */
lf.query.InsertContext.prototype.getScope = function() {
  var scope = lf.structs.set.create();
  scope.add(this.into);
  var info = this.schema.info();
  info.getParentTables(this.into.getName()).forEach(scope.add.bind(scope));
  if (this.allowReplace) {
    info.getChildTables(this.into.getName()).forEach(scope.add.bind(scope));
  }
  return scope;
};


/** @override */
lf.query.InsertContext.prototype.clone = function() {
  var context = new lf.query.InsertContext(this.schema);
  context.cloneBase(this);
  context.into = this.into;
  if (this.values) {
    context.values = (this.values instanceof lf.Binder) ? this.values :
        this.values.slice();
  }
  context.allowReplace = this.allowReplace;
  context.binder = this.binder;
  return context;
};


/** @override */
lf.query.InsertContext.prototype.bind = function(values) {
  lf.query.InsertContext.base(this, 'bind', values);

  if (this.binder) {
    if (this.binder instanceof lf.Binder) {
      this.values =
          /** @type {!Array<!lf.Row>} */ (values[this.binder.getIndex()]);
    } else {
      this.values = this.binder.map(function(val) {
        return val instanceof lf.Binder ? values[val.getIndex()] : val;
      });
    }
  }
  return this;
};
