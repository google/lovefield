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
goog.provide('lf.proc.DeleteStep');
goog.provide('lf.proc.IndexRangeScanStep');
goog.provide('lf.proc.OrderByStep');
goog.provide('lf.proc.PhysicalQueryPlan');
goog.provide('lf.proc.SelectStep');
goog.provide('lf.proc.TableAccessByRowIdStep');
goog.provide('lf.proc.TableAccessFullStep');
goog.provide('lf.proc.UpdateStep');

goog.require('goog.Promise');
goog.require('goog.asserts');
goog.require('goog.structs.Set');
goog.require('lf.Order');
goog.require('lf.Row');
goog.require('lf.proc.PhysicalQueryPlanNode');
goog.require('lf.proc.Relation');
goog.require('lf.query.SelectContext');

goog.forwardDeclare('lf.query.UpdateContext.Set');



/**
 * @param {!lf.proc.PhysicalQueryPlanNode} rootNode
 * @constructor @struct
 */
lf.proc.PhysicalQueryPlan = function(rootNode) {
  /** @private {!lf.proc.PhysicalQueryPlanNode} */
  this.rootNode_ = rootNode;
};


/** @return {!lf.proc.PhysicalQueryPlanNode} */
lf.proc.PhysicalQueryPlan.prototype.getRoot = function() {
  return this.rootNode_;
};


/** @return {string} A textual representation of this query plan. */
lf.proc.PhysicalQueryPlan.prototype.explain = function() {
  // TODO(dpapad): Implement this.
  return 'plan description';
};


/**
 * @return {!Array.<!lf.schema.Table>} Scope of this plan (i.e. tables
 *     involved).
 */
lf.proc.PhysicalQueryPlan.prototype.getScope = function() {
  var scope = new goog.structs.Set();

  /** @param {!lf.proc.PhysicalQueryPlanNode} node */
  var traverse = function(node) {
    var table = node.getScope();
    if (table) {
      scope.add(table);
    }
    node.getChildren().forEach(function(child) {
      traverse(/** @type {!lf.proc.PhysicalQueryPlanNode} */ (child));
    });
  };

  traverse(this.rootNode_);
  return scope.getValues();
};


/**
 * Calculates the combined scope of the given list of physical query plans.
 * @param {!Array.<!lf.proc.PhysicalQueryPlan>} plans
 * @return {!goog.structs.Set.<!lf.schema.Table>} The schemas of all tables
 *     involved.
 */
lf.proc.PhysicalQueryPlan.getCombinedScope = function(plans) {
  var tableSet = new goog.structs.Set();
  plans.forEach(function(plan) {
    tableSet.addAll(plan.getScope());
  });
  return tableSet;
};



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!lf.schema.Table} table
 * @param {!Array.<!lf.query.UpdateContext.Set>} updates
 */
lf.proc.UpdateStep = function(table, updates) {
  lf.proc.UpdateStep.base(this, 'constructor');

  /** @private {!lf.schema.Table} table */
  this.table_ = table;

  /** @private {!Array.<!lf.query.UpdateContext.Set>} */
  this.updates_ = updates;
};
goog.inherits(lf.proc.UpdateStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.UpdateStep.prototype.toString = function() {
  return 'update(' + this.table_.getName() + ')';
};


/** @override */
lf.proc.UpdateStep.prototype.getScope = function() {
  return this.table_;
};


/** @override */
lf.proc.UpdateStep.prototype.exec = function(journal) {
  return this.getChildAt(0).exec(journal).then(goog.bind(
      /**
       * @param {!lf.proc.Relation} relation
       * @this {lf.proc.UpdateStep}
       */
      function(relation) {
        var rows = relation.entries.map(function(entry) {
          this.updates_.forEach(function(update) {
            entry.row.payload()[update.column.getName()] = update.value;
          }, this);
          return entry.row;
        }, this);
        journal.update(this.table_, rows);
        return goog.Promise.resolve(lf.proc.Relation.createEmpty());
      }, this));
};



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!lf.schema.Table} table
 */
lf.proc.DeleteStep = function(table) {
  lf.proc.DeleteStep.base(this, 'constructor');

  /** @private {!lf.schema.Table} table */
  this.table_ = table;
};
goog.inherits(lf.proc.DeleteStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.DeleteStep.prototype.toString = function() {
  return 'delete(' + this.table_.getName() + ')';
};


/** @override */
lf.proc.DeleteStep.prototype.getScope = function() {
  return this.table_;
};


/** @override */
lf.proc.DeleteStep.prototype.exec = function(journal) {
  // TODO(dpapad): Assert that this node has exactly one child.

  return this.getChildAt(0).exec(journal).then(goog.bind(
      /**
       * @param {!lf.proc.Relation} relation
       * @this {lf.proc.DeleteStep}
       */
      function(relation) {
        var rows = relation.entries.map(function(entry) {
          return entry.row;
        });
        journal.remove(this.table_, rows);
        return goog.Promise.resolve(lf.proc.Relation.createEmpty());
      }, this));
};



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!lf.schema.Table} table
 */
lf.proc.TableAccessFullStep = function(table) {
  lf.proc.TableAccessFullStep.base(this, 'constructor');

  /** @type {!lf.schema.Table} */
  this.table = table;
};
goog.inherits(lf.proc.TableAccessFullStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.TableAccessFullStep.prototype.toString = function() {
  return 'table_access(' + this.table.getName() + ')';
};


/** @override */
lf.proc.TableAccessFullStep.prototype.getScope = function() {
  return this.table;
};


/** @override */
lf.proc.TableAccessFullStep.prototype.exec = function(journal) {
  var tableName = this.table.getName();
  return goog.Promise.resolve(lf.proc.Relation.fromRows(
      journal.getTableRows(tableName), [tableName]));
};



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!lf.schema.Table} table
 */
lf.proc.TableAccessByRowIdStep = function(table) {
  lf.proc.TableAccessByRowIdStep.base(this, 'constructor');

  /** @private {!lf.schema.Table} */
  this.table_ = table;
};
goog.inherits(lf.proc.TableAccessByRowIdStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.TableAccessByRowIdStep.prototype.toString = function() {
  return 'table_access_by_row_id(' + this.table_.getName() + ')';
};


/** @override */
lf.proc.TableAccessByRowIdStep.prototype.getScope = function() {
  return this.table_;
};


/** @override */
lf.proc.TableAccessByRowIdStep.prototype.exec = function(journal) {
  return /** @type {!IThenable.<!lf.proc.Relation>} */ (
      this.getChildAt(0).exec(journal).then(goog.bind(
      function(relation) {
        var tableName = this.table_.getName();
        return goog.Promise.resolve(lf.proc.Relation.fromRows(
            journal.getTableRows(tableName, relation.getRowIds()),
            [tableName]));
      }, this)));
};



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!lf.schema.Index} index
 * @param {!Array.<!lf.index.KeyRange>} keyRanges
 */
lf.proc.IndexRangeScanStep = function(index, keyRanges) {
  lf.proc.IndexRangeScanStep.base(this, 'constructor');

  /** @private {!lf.schema.Index} */
  this.index_ = index;

  /** @private {!Array.<!lf.index.KeyRange>} */
  this.keyRanges_ = keyRanges;
};
goog.inherits(lf.proc.IndexRangeScanStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.IndexRangeScanStep.prototype.toString = function() {
  return 'index_range_scan(' +
      this.index_.getNormalizedName() + ', ' +
      this.keyRanges_.toString() + ')';
};


/** @override */
lf.proc.IndexRangeScanStep.prototype.exec = function(journal) {
  var rowIds = journal.getIndexRange(this.index_, this.keyRanges_);
  var rows = rowIds.map(function(rowId) {
    return new lf.Row(rowId, {});
  }, this);

  return goog.Promise.resolve(lf.proc.Relation.fromRows(
      rows, [this.index_.tableName]));
};



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!lf.Predicate} predicate
 */
lf.proc.SelectStep = function(predicate) {
  lf.proc.SelectStep.base(this, 'constructor');

  /** @type {lf.Predicate} */
  this.predicate = predicate;
};
goog.inherits(lf.proc.SelectStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.SelectStep.prototype.toString = function() {
  return 'select(' + this.predicate.toString() + ')';
};


/** @override */
lf.proc.SelectStep.prototype.exec = function(journal) {
  return this.getChildAt(0).exec(journal).then(goog.bind(
      /**
       * @param {!lf.proc.Relation} relation
       * @this {lf.proc.SelectStep}
       */
      function(relation) {
        return this.predicate.eval(relation);
      }, this));
};



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!Array.<!lf.query.SelectContext.OrderBy>} orderBy
 */
lf.proc.OrderByStep = function(orderBy) {
  lf.proc.OrderByStep.base(this, 'constructor');

  /** @type {!Array.<!lf.query.SelectContext.OrderBy>} */
  this.orderBy = orderBy;
};
goog.inherits(lf.proc.OrderByStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.OrderByStep.prototype.toString = function() {
  return 'order_by(' +
      lf.query.SelectContext.orderByToString(this.orderBy) + ')';
};


/** @override */
lf.proc.OrderByStep.prototype.exec = function(journal) {
  return this.getChildAt(0).exec(journal).then(goog.bind(
      /**
       * @param {!lf.proc.Relation} relation
       * @this {lf.proc.OrderByStep}
       */
      function(relation) {
        var useNormalizedNames = relation.isPrefixApplied();
        relation.entries.sort(
            this.comparatorFn_.bind(this, useNormalizedNames));
        return relation;
      }, this));
};


/**
 * Comparator function used for sorting.
 *
 * @param {boolean} useNormalizedNames Whether normalized names should be used
 *     when constructing/referring to row payloads.
 * @param {!lf.proc.RelationEntry} lhs The first operand.
 * @param {!lf.proc.RelationEntry} rhs The second operand.
 * @return {number} -1 if a should precede b, 1 if b should precede a, 0 if a
 *     and b are determined to be equal.
 * @private
 */
lf.proc.OrderByStep.prototype.comparatorFn_ = function(
    useNormalizedNames, lhs, rhs) {
  var leftPayload = null;
  var rightPayload = null;
  var order = null;

  var comparisonIndex = -1;
  do {
    comparisonIndex++;
    var column = this.orderBy[comparisonIndex].column;
    var attributeName = useNormalizedNames ?
        column.getNormalizedName() : column.getName();

    order = this.orderBy[comparisonIndex].order;
    leftPayload = lhs.row.payload()[attributeName];
    rightPayload = rhs.row.payload()[attributeName];
  } while (leftPayload == rightPayload &&
      comparisonIndex + 1 < this.orderBy.length);

  if (leftPayload < rightPayload) {
    return order == lf.Order.ASC ? -1 : 1;
  } else if (leftPayload > rightPayload) {
    return order == lf.Order.ASC ? 1 : -1;
  } else {
    return 0;
  }
};
