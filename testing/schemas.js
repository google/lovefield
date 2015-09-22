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
 */
goog.setTestOnly();

goog.provide('lf.testing.schemas');

goog.require('lf.ConstraintAction');
goog.require('lf.Type');
goog.require('lf.schema');


/**
 * @param {!lf.ConstraintAction} constraintAction The type of foreign key
 *     constraints to be added to the schema.
 * @return {!lf.schema.Database} A schema where TableC refers to TableB, and
 *     TableB refers to tableA.
 */
lf.testing.schemas.getTableChain = function(constraintAction) {
  var schemaBuilder = lf.schema.create('contexttest', 1);
  schemaBuilder.createTable('TableA').
      addColumn('id', lf.Type.STRING).
      addPrimaryKey(['id']);
  schemaBuilder.createTable('TableB').
      addColumn('id', lf.Type.STRING).
      addColumn('foreignKey', lf.Type.STRING).
      addPrimaryKey(['id']).
      addForeignKey('fk_tableA', {
        local: 'foreignKey',
        ref: 'TableA.id',
        action: constraintAction
      });
  schemaBuilder.createTable('TableC').
      addColumn('id', lf.Type.STRING).
      addColumn('foreignKey', lf.Type.STRING).
      addForeignKey('fk_tableB', {
        local: 'foreignKey',
        ref: 'TableB.id',
        action: constraintAction
      });
  return schemaBuilder.getSchema();
};


/**
 * Generates a schema with two tables, Parent and Child, linked with a RESTRICT
 * constraint of the given constraint timing.
 * @param {!lf.ConstraintTiming} constraintTiming
 * @return {!lf.schema.Database} A schema where table Child refers to Parent.
 */
lf.testing.schemas.getOneForeignKey = function(constraintTiming) {
  var schemaBuilder = lf.schema.create('testschema', 1);
  schemaBuilder.createTable('Child').
      addColumn('id', lf.Type.STRING).
      addForeignKey('fk_Id', {
        local: 'id',
        ref: 'Parent.id',
        action: lf.ConstraintAction.RESTRICT,
        timing: constraintTiming
      });
  schemaBuilder.createTable('Parent').
      addColumn('id', lf.Type.STRING).
      addPrimaryKey(['id']);
  return schemaBuilder.getSchema();
};


/**
 * @param {!lf.ConstraintAction} constraintAction The type of foreign key
 *     constraints to be added to the schema.
 * @return {!lf.schema.Database} A schema where TableB1 and TableB2 both refer
 *     to TableA.
 */
lf.testing.schemas.getTwoForeignKeys = function(constraintAction) {
  var schemaBuilder = lf.schema.create('contexttest', 1);
  schemaBuilder.createTable('TableA').
      addColumn('id1', lf.Type.STRING).
      addColumn('id2', lf.Type.STRING).
      addUnique('uq_id1', ['id1']).
      addUnique('uq_id2', ['id2']);
  schemaBuilder.createTable('TableB1').
      addColumn('id', lf.Type.STRING).
      addColumn('foreignKey', lf.Type.STRING).
      addForeignKey('fk_tableA', {
        local: 'foreignKey',
        ref: 'TableA.id1',
        action: constraintAction
      });
  schemaBuilder.createTable('TableB2').
      addColumn('id', lf.Type.STRING).
      addColumn('foreignKey', lf.Type.STRING).
      addForeignKey('fk_tableA', {
        local: 'foreignKey',
        ref: 'TableA.id2',
        action: constraintAction
      });
  return schemaBuilder.getSchema();
};
