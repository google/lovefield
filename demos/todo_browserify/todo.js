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
var lf = require('./bower_components/lovefield/dist/lovefield.js');

var schemaBuilder = lf.schema.create('todo', 1);
schemaBuilder.createTable('Item').
    addColumn('id', lf.Type.INTEGER).
    addColumn('description', lf.Type.STRING).
    addColumn('deadline', lf.Type.DATE_TIME).
    addColumn('done', lf.Type.BOOLEAN).
    addPrimaryKey(['id']).
    addIndex('idxDeadline', ['deadline'], false, lf.Order.DESC);
var todoDb;
var item;
schemaBuilder.connect({storeType: lf.schema.DataStoreType.MEMORY}).then(
    function(db) {
      todoDb = db;
      item = db.getSchema().table('Item');
      var row = item.createRow({
        'id': 1,
        'description': 'Get a cup of coffee',
        'deadline': new Date(),
        'done': false
      });
      return db.insertOrReplace().into(item).values([row]).exec();
    }).then(
    function() {
      return todoDb.select().from(item).where(item.done.eq(false)).exec();
    }).then(
    function(results) {
      results.forEach(function(row) {
        console.log(row['description'], 'before', row['deadline']);
        document.body.textContent =
            row['description'] + ' before ' + row['deadline'];
      });
    });
