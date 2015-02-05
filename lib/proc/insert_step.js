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
goog.provide('lf.proc.InsertOrReplaceStep');
goog.provide('lf.proc.InsertStep');

goog.require('goog.Promise');
goog.require('lf.proc.PhysicalQueryPlanNode');
goog.require('lf.proc.Relation');



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!lf.schema.Table} table
 * @param {!Array.<!lf.Row>} values
 */
lf.proc.InsertStep = function(table, values) {
  lf.proc.InsertStep.base(this, 'constructor');

  /** @private {!Array.<!lf.Row>} */
  this.values_ = values;

  /** @private {!lf.schema.Table} table */
  this.table_ = table;
};
goog.inherits(lf.proc.InsertStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.InsertStep.prototype.toString = function() {
  return 'insert(' + this.table_.getName() + ')';
};


/** @override */
lf.proc.InsertStep.prototype.getScope = function() {
  return this.table_;
};


/** @override */
lf.proc.InsertStep.prototype.exec = function(journal) {
  lf.proc.InsertStep.assignAutoIncrementPks_(
      this.table_, this.values_, journal.getIndexStore());
  journal.insert(this.table_, this.values_);
  return goog.Promise.resolve(lf.proc.Relation.createEmpty());
};


/**
 * Assigns primary keys if 'autoIncrement' is specified for this table, only for
 * rows where the primary key has been left unspecified.
 * @param {!lf.schema.Table} table The table schema.
 * @param {!Array<!lf.Row>} values
 * @param {!lf.index.IndexStore} indexStore
 * @private
 */
lf.proc.InsertStep.assignAutoIncrementPks_ = function(
    table, values, indexStore) {
  var pkIndexSchema = table.getConstraint().getPrimaryKey();
  var autoIncrement = pkIndexSchema.columns[0].autoIncrement;
  if (autoIncrement) {
    var pkColumnName = pkIndexSchema.columns[0].name;
    var index = indexStore.get(pkIndexSchema.getNormalizedName());
    var maxKey = index.max()[0] || 0;

    values.forEach(function(row) {
      // The value of zero indicates that a primary key should automatically be
      // assigned.
      if (row.payload()[pkColumnName] == 0) {
        maxKey++;
        row.payload()[pkColumnName] = maxKey;
      }
    });
  }
};



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!lf.schema.Table} table
 * @param {!Array.<!lf.Row>} values
 */
lf.proc.InsertOrReplaceStep = function(table, values) {
  lf.proc.InsertOrReplaceStep.base(this, 'constructor');

  /** @private {!Array.<!lf.Row>} */
  this.values_ = values;

  /** @private {!lf.schema.Table} table */
  this.table_ = table;
};
goog.inherits(lf.proc.InsertOrReplaceStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.InsertOrReplaceStep.prototype.toString = function() {
  return 'insert_replace(' + this.table_.getName() + ')';
};


/** @override */
lf.proc.InsertOrReplaceStep.prototype.getScope = function() {
  return this.table_;
};


/** @override */
lf.proc.InsertOrReplaceStep.prototype.exec = function(journal) {
  lf.proc.InsertStep.assignAutoIncrementPks_(
      this.table_, this.values_, journal.getIndexStore());
  journal.insertOrReplace(this.table_, this.values_);
  return goog.Promise.resolve(lf.proc.Relation.createEmpty());
};
