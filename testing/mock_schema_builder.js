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
goog.provide('lf.testing.getSchemaBuilder');

goog.require('lf.ConstraintTiming');
goog.require('lf.Order');
goog.require('lf.Type');
goog.require('lf.schema');


/**
 * @param {string=} opt_name
 * @param {boolean=} opt_simulatePersistentIndex Simulate persistent index on
 *     tableA, default to false.
 * @return {!lf.schema.Builder}
 */
lf.testing.getSchemaBuilder = function(opt_name, opt_simulatePersistentIndex) {
  var schemaBuilder = lf.schema.create(opt_name || ('ms' + goog.now()), 1);

  schemaBuilder.createTable('tableA').
      addColumn('id', lf.Type.STRING).
      addColumn('name', lf.Type.STRING).
      addPrimaryKey(['id']).
      addIndex('idxName', [{'name': 'name', 'order': lf.Order.DESC}]).
      persistentIndex(opt_simulatePersistentIndex || false);

  schemaBuilder.createTable('tableB').
      addColumn('id', lf.Type.STRING).
      addColumn('name', lf.Type.STRING).
      addPrimaryKey(['id']).
      addIndex('idxName', [{'name': 'name', 'order': lf.Order.DESC}]);

  schemaBuilder.createTable('tableC').
      addColumn('id', lf.Type.STRING).
      addColumn('name', lf.Type.STRING);

  schemaBuilder.createTable('tableD').
      addColumn('id1', lf.Type.STRING).
      addColumn('id2', lf.Type.NUMBER).
      addColumn('firstName', lf.Type.STRING).
      addColumn('lastName', lf.Type.STRING).
      addPrimaryKey(['id1', 'id2']).
      addUnique('uq_name', ['firstName', 'lastName']);

  schemaBuilder.createTable('tableE').
      addColumn('id', lf.Type.STRING).
      addColumn('email', lf.Type.STRING).
      addPrimaryKey(['id']).
      addUnique('uq_email', ['email']);

  schemaBuilder.createTable('tableF').
      addColumn('id', lf.Type.STRING).
      addColumn('name', lf.Type.STRING).
      addNullable(['name']).
      addIndex('idxName', [{'name': 'name', 'order': lf.Order.ASC}]);

  schemaBuilder.createTable('tableG').
      addColumn('id', lf.Type.STRING).
      addColumn('id2', lf.Type.STRING).
      addUnique('uq_id2', ['id2']).
      addForeignKey('fk_Id', {
        local: 'id',
        ref: 'tableI.id'
      }).
      addIndex('idx_Id', [{'name': 'id', 'order': lf.Order.ASC}]);

  schemaBuilder.createTable('tableH').
      addColumn('id', lf.Type.STRING).
      addColumn('id2', lf.Type.STRING).
      addForeignKey('fk_Id', {
        local: 'id',
        ref: 'tableG.id2',
        timing: lf.ConstraintTiming.DEFERRABLE
      }).
      addForeignKey('fk_Id2', {
        local: 'id2',
        ref: 'tableI.id2',
        timing: lf.ConstraintTiming.DEFERRABLE
      });

  schemaBuilder.createTable('tableI').
      addColumn('id', lf.Type.STRING).
      addColumn('id2', lf.Type.STRING).
      addPrimaryKey(['id']).
      addUnique('uq_id2', ['id2']).
      addColumn('name', lf.Type.STRING).
      addNullable(['name']).
      addIndex('idxName', [{'name': 'name', 'order': lf.Order.ASC}]);

  schemaBuilder.createTable('tableJ').
      addColumn('id', lf.Type.STRING).
      addColumn('id2', lf.Type.STRING).
      addNullable(['id', 'id2']).
      addIndex('idxId', ['id', 'id2'], true);

  return schemaBuilder;
};
