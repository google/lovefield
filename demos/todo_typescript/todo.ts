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
/// <reference path="./typings/lovefield/lovefield.d.ts"/>


function main(): void {
  var schemaBuilder: lf.schema.Builder = lf.schema.create('todo', 1);

  schemaBuilder.createTable('Item').
      addColumn('id', lf.Type.INTEGER).
      addColumn('description', lf.Type.STRING).
      addColumn('deadline', lf.Type.DATE_TIME).
      addColumn('done', lf.Type.BOOLEAN).
      addPrimaryKey(['id'], false).
      addIndex('idxDeadline', ['deadline'], false, lf.Order.DESC);

  var todoDb: lf.Database = null;
  var dummyItem: lf.schema.Table = null;
  var connectOptions: lf.schema.ConnectOptions = {
    storeType: lf.schema.DataStoreType.MEMORY
  };
  schemaBuilder.connect(connectOptions).then(
      function(db) {
        todoDb = db;
        dummyItem = db.getSchema().table('Item');
        var row = dummyItem.createRow({
          'id': 1,
          'description': 'Get a cup of coffee',
          'deadline': new Date(),
          'done': false
        });

        return db.insertOrReplace().into(dummyItem).values([row]).exec();
      }).then(
      function() {
        var column: lf.schema.Column = (<any>dummyItem).done;
        return todoDb.select().from(dummyItem).where(column.eq(false)).exec();
      }).then(
      function(results) {
        results.forEach(function(row) {
          console.log((<any>row).description, 'before',  (<any>row).deadline);
          document.body.textContent =
              (<any>row).description + ' before ' + (<any>row).deadline;
        });
      });
}

main();
