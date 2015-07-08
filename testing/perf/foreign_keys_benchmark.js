/**
 * @license
 * Copyright 2015 The Lovefield Project Authors. All Rights Reserved.
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
 *
 * @fileoverview Benchmark for a schema with foreign key constraints.
 */
goog.setTestOnly();
goog.provide('lf.testing.perf.ForeignKeysBenchmark');

goog.require('lf.ConstraintTiming');
goog.require('lf.Type');
goog.require('lf.schema');
goog.require('lf.schema.DataStoreType');
goog.require('lf.testing.perf.Benchmark');
goog.require('lf.testing.perf.TestCase');



/**
 * @constructor @struct @final
 * @implements {lf.testing.perf.Benchmark}
 *
 * @param {!lf.Database} db
 * @param {?lf.ConstraintTiming} constraintTiming A null value implies
 *     no-constraints.
 */
lf.testing.perf.ForeignKeysBenchmark = function(db, constraintTiming) {
  /** @private {!lf.Database} */
  this.db_ = db;

  /** @private {?lf.ConstraintTiming} */
  this.constraintTiming_ = constraintTiming;

  /** @private {!lf.schema.Table} */
  this.parent_ = this.db_.getSchema().table('Parent');

  /** @private {!lf.schema.Table} */
  this.child_ = this.db_.getSchema().table('Child');

  var sampleRows = this.generateSampleData_();

  /** @private {!Array<!lf.Row>} */
  this.parentsWithChildren_ = sampleRows[0];

  /** @private {!Array<!lf.Row>} */
  this.parentsWithoutChildren_ = sampleRows[1];

  /** @private {!Array<!lf.Row>} */
  this.parents_ = this.parentsWithChildren_.concat(
      this.parentsWithoutChildren_);

  /** @private {!Array<!lf.Row>} */
  this.updatedParents_ = this.parents_.map(
      function(row) {
        return this.parent_.createRow({
          id: row.payload()['id'],
          name: 'updatedName' + row.payload()['id']
        });
      }, this);

  /** @private {!Array<!lf.Row>} */
  this.children_ = sampleRows[2];
};


/**
 * @return {!Array<!Array<!lf.Row>>}
 * @private
 */
lf.testing.perf.ForeignKeysBenchmark.prototype.generateSampleData_ =
    function() {
  var parentWithChildrenCount = 10000;
  var parentWithoutChildrenCount = 50000;
  var childRowCount = 60000;

  var parentWithChildrenRows = new Array(parentWithChildrenCount);
  for (var i = 0; i < parentWithChildrenRows.length; i++) {
    parentWithChildrenRows[i] = this.parent_.createRow({
      id: i,
      name: 'name' + i.toString()
    });
  }

  var parentWithoutChildrenRows = new Array(parentWithoutChildrenCount);
  for (var i = 0; i < parentWithoutChildrenRows.length; i++) {
    parentWithoutChildrenRows[i] = this.parent_.createRow({
      id: parentWithChildrenRows.length + i,
      name: 'name' + i.toString()
    });
  }

  var childRows = new Array(childRowCount);
  for (var i = 0; i < childRows.length; i++) {
    childRows[i] = this.child_.createRow({
      id: i,
      parentId: i % parentWithChildrenCount,
      name: 'name' + i.toString()
    });
  }

  return [parentWithChildrenRows, parentWithoutChildrenRows, childRows];
};


/** @return {!IThenable} */
lf.testing.perf.ForeignKeysBenchmark.prototype.insertParent = function() {
  return this.db_.
      insert().
      into(this.parent_).
      values(this.parents_).
      exec();
};


/** @return {!IThenable<boolean>} */
lf.testing.perf.ForeignKeysBenchmark.prototype.validateInsertParent =
    function() {
  return this.db_.select().from(this.parent_).exec().then(
      function(results) {
        return results.length == this.parents_.length;
      }.bind(this));
};


/** @return {!IThenable} */
lf.testing.perf.ForeignKeysBenchmark.prototype.insertChild = function() {
  return this.db_.
      insert().
      into(this.child_).
      values(this.children_).
      exec();
};


/** @return {!IThenable<boolean>} */
lf.testing.perf.ForeignKeysBenchmark.prototype.validateInsertChild =
    function() {
  return this.db_.select().from(this.child_).exec().then(
      function(results) {
        return results.length == this.children_.length;
      }.bind(this));
};


/** @return {!IThenable} */
lf.testing.perf.ForeignKeysBenchmark.prototype.updateParent = function() {
  return this.db_.
      insertOrReplace().
      into(this.parent_).
      values(this.updatedParents_).
      exec();
};


/** @return {!IThenable<boolean>} */
lf.testing.perf.ForeignKeysBenchmark.prototype.validateUpdateParent =
    function() {
  return this.db_.select().from(this.parent_).exec().then(
      function(results) {
        return results.length == this.parents_.length && results.every(
            function(obj) {
              return obj['name'].indexOf('updatedName') != -1;
            });
      }.bind(this));
};


/** @return {!IThenable} */
lf.testing.perf.ForeignKeysBenchmark.prototype.updateChild = function() {
  var targetIndex = Math.floor(this.parentsWithChildren_.length / 2);
  var targetParentId = this.parentsWithChildren_[targetIndex].payload()['id'];
  var targetChildId = Math.floor(this.children_.length / 2);

  // Updating all children that have parentId greater than a given id.
  return this.db_.
      update(this.child_).
      set(this.child_['parentId'], targetParentId).
      where(this.child_['id'].gt(targetChildId)).
      exec();
};


/** @return {!IThenable<boolean>} */
lf.testing.perf.ForeignKeysBenchmark.prototype.validateUpdateChild =
    function() {
  var targetIndex = Math.floor(this.parentsWithChildren_.length / 2);
  var targetParentId = this.parentsWithChildren_[targetIndex].payload()['id'];

  return this.db_.select().
      from(this.child_).
      where(this.child_['parentId'].gt(targetParentId)).
      exec().then(
      function(results) {
        return results.length > 0 && results.every(function(obj) {
          return obj['parentId'] > targetParentId;
        });
      }.bind(this));
};


/** @return {!IThenable} */
lf.testing.perf.ForeignKeysBenchmark.prototype.deleteParent = function() {
  // Finding first parent without children row.
  var targetId = this.parentsWithoutChildren_[0].payload()['id'];

  return this.db_.
      delete().
      from(this.parent_).
      where(this.parent_['id'].gte(targetId)).
      exec();
};


/** @return {!IThenable<boolean>} */
lf.testing.perf.ForeignKeysBenchmark.prototype.validateDeleteParent =
    function() {
  var targetId = this.parentsWithoutChildren_[0].payload()['id'];

  return this.db_.
      select().
      from(this.parent_).
      where(this.parent_['id'].gte(targetId)).
      exec().then(
      function(results) {
        return results.length == 0;
      });
};


/** @return {!IThenable} */
lf.testing.perf.ForeignKeysBenchmark.prototype.deleteChild = function() {
  return this.db_.
      delete().
      from(this.child_).
      exec();
};


/** @return {!IThenable<boolean>} */
lf.testing.perf.ForeignKeysBenchmark.prototype.validateDeleteChild =
    function() {
  return this.db_.
      select().
      from(this.child_).
      exec().then(
      function(results) {
        return results.length == 0;
      });
};


/** @return {!IThenable} */
lf.testing.perf.ForeignKeysBenchmark.prototype.tearDown = function() {
  return this.db_.delete().from(this.child_).exec().then(
      function() {
        return this.db_.delete().from(this.parent_).exec();
      }.bind(this));
};


/** @override */
lf.testing.perf.ForeignKeysBenchmark.prototype.getTestCases = function() {
  var suffix = lf.testing.perf.ForeignKeysBenchmark.getSuffix_(
      this.constraintTiming_);
  return [
    new lf.testing.perf.TestCase(
        'InsertParent_' + this.parents_.length + suffix,
        this.insertParent.bind(this),
        this.validateInsertParent.bind(this)),
    new lf.testing.perf.TestCase(
        'InsertChild_' + this.children_.length + suffix,
        this.insertChild.bind(this),
        this.validateInsertChild.bind(this)),
    new lf.testing.perf.TestCase(
        'UpdateParent_' + this.parents_.length + suffix,
        this.updateParent.bind(this),
        this.validateUpdateParent.bind(this)),
    new lf.testing.perf.TestCase(
        'UpdateChild_' + this.children_.length + suffix,
        this.updateChild.bind(this),
        this.validateUpdateChild.bind(this)),
    new lf.testing.perf.TestCase(
        'DeleteParent_' + this.parentsWithoutChildren_.length + suffix,
        this.deleteParent.bind(this),
        this.validateDeleteParent.bind(this)),
    new lf.testing.perf.TestCase(
        'DeleteChild_' + this.children_.length + suffix,
        this.deleteChild.bind(this),
        this.validateDeleteChild.bind(this)),
    new lf.testing.perf.TestCase(
        'TearDown' + suffix,
        this.tearDown.bind(this), undefined, true)
  ];
};


/**
 * @param {?lf.ConstraintTiming} constraintTiming
 * @return {string} A suffix to be used for the test cases names.
 * @private
 */
lf.testing.perf.ForeignKeysBenchmark.getSuffix_ = function(constraintTiming) {
  if (constraintTiming == lf.ConstraintTiming.IMMEDIATE) {
    return '_immediate';
  } else if (constraintTiming == lf.ConstraintTiming.DEFERRABLE) {
    return '_deferrable';
  } else { // Case of goog.isNull(this.constraintTiming_).
    return '_nofk';
  }
};


/**
 * @param {?lf.ConstraintTiming} constraintTiming The type of foreign key
 *     constraints to be tested. null value implies no foreign key constraints.
 * @return {!lf.schema.Builder}
 */
lf.testing.perf.ForeignKeysBenchmark.getSchemaBuilder =
    function(constraintTiming) {
  var suffix = lf.testing.perf.ForeignKeysBenchmark.getSuffix_(
      constraintTiming);

  var schemaBuilder = lf.schema.create('fk_bench' + suffix, 1);
  schemaBuilder.createTable('Parent').
      addColumn('id', lf.Type.INTEGER).
      addColumn('name', lf.Type.STRING).
      addPrimaryKey(['id']);

  var childBuilder = schemaBuilder.createTable('Child').
      addColumn('id', lf.Type.INTEGER).
      addColumn('parentId', lf.Type.INTEGER).
      addColumn('name', lf.Type.STRING).
      addPrimaryKey(['id']);

  if (!goog.isNull(constraintTiming)) {
    childBuilder.addForeignKey('fk_parentId', {
      local: 'parentId',
      ref: 'Parent.id',
      timing: constraintTiming
    });
  }

  return schemaBuilder;
};


/**
 * @param {?lf.ConstraintTiming} constraintTiming The type of foreign key
 *     constraints to be tested. null value implies no foreign key constraints.
 * @return {!IThenable<!lf.testing.perf.ForeignKeysBenchmark>}
 */
lf.testing.perf.ForeignKeysBenchmark.create =
    function(constraintTiming) {
  var schemaBuilder = lf.testing.perf.ForeignKeysBenchmark.getSchemaBuilder(
      constraintTiming);
  return schemaBuilder.connect({
    storeType: lf.schema.DataStoreType.MEMORY
  }).then(function(db) {
    return new lf.testing.perf.ForeignKeysBenchmark(
        db, constraintTiming);
  });
};
