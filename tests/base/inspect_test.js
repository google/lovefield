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
goog.require('goog.Promise');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('lf.Type');
goog.require('lf.debug.inspect');
goog.require('lf.schema');
goog.require('lf.schema.DataStoreType');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('Inspect');


/** @type {!Date} */
var expectedDate;


/** @return {!Array<!lf.schema.Builder>} */
function createSchemaBuilders() {
  var dsHr = lf.schema.create('hr', 2);
  dsHr.createTable('Region').
      addColumn('id', lf.Type.STRING).
      addColumn('name', lf.Type.STRING).
      addPrimaryKey(['id']);
  dsHr.createTable('Foo').
      addColumn('id', lf.Type.STRING).
      addColumn('bar', lf.Type.INTEGER);

  var dsOrder = lf.schema.create('order', 7);
  dsOrder.createTable('Region').
      addColumn('id', lf.Type.INTEGER).
      addColumn('date', lf.Type.DATE_TIME).
      addPrimaryKey(['id']);

  return [dsHr, dsOrder];
}


/**
 * @param {!lf.proc.Database} db
 * @return {!IThenable}
 */
function addSample1(db) {
  var table = db.getSchema().table('Region');
  var rows = [];
  for (var i = 0; i < 100; ++i) {
    rows.push(table.createRow({
      'id': i.toString(),
      'name': 'n' + i.toString()
    }));
  }
  return db.insert().into(table).values(rows).exec();
}


/**
 * @param {!lf.proc.Database} db
 * @return {!IThenable}
 */
function addSample2(db) {
  expectedDate = new Date();
  var table = db.getSchema().table('Region');
  var rows = [];
  for (var i = 0; i < 100; ++i) {
    rows.push(table.createRow({
      'id': i,
      'date': expectedDate
    }));
  }
  return db.insert().into(table).values(rows).exec();
}


function testInspector() {
  asyncTestCase.waitForAsync('testInspector');
  var builders = createSchemaBuilders();
  var promises = builders.map(function(builder) {
    return builder.connect({
      storeType: lf.schema.DataStoreType.MEMORY,
      enableInspector: true
    });
  });

  var db1;
  var db2;
  goog.Promise.all(promises).then(function(connections) {
    db1 = connections[0];
    db2 = connections[1];
    return goog.Promise.all([addSample1(db1), addSample2(db2)]);
  }).then(function() {
    assertEquals('{"hr":2,"order":7}', lf.debug.inspect(null, null));
    assertEquals('{"Region":100,"Foo":0}', lf.debug.inspect('hr', null));
    assertEquals('{"Region":100}', lf.debug.inspect('order', null));
    assertEquals('[{"id":"88","name":"n88"},{"id":"89","name":"n89"}]',
        lf.debug.inspect('hr', 'Region', 2, 88));
    assertEquals('[]', lf.debug.inspect('hr', 'Region', undefined, 100));
    assertEquals('[{"id":77,"date":' + JSON.stringify(expectedDate) + '}]',
        lf.debug.inspect('order', 'Region', 1, 77));
    asyncTestCase.continueTesting();
  });
}
