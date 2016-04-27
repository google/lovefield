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
goog.setTestOnly();
goog.require('goog.testing.jsunit');
goog.require('lf.Global');
goog.require('lf.Row');
goog.require('lf.proc.NoOpStep');
goog.require('lf.proc.Relation');
goog.require('lf.proc.SkipStep');
goog.require('lf.query.SelectContext');
goog.require('lf.structs.set');
goog.require('lf.testing.MockEnv');
goog.require('lf.testing.getSchemaBuilder');


/** @type {!lf.schema.Database} */
var schema;

function setUp() {
  schema = lf.testing.getSchemaBuilder().getSchema();
  var env = new lf.testing.MockEnv(schema);
  return env.init();
}


function testExec_SkipLessThanResults() {
  return checkExec(/* sampleDataCount */ 20, /* skip */ 11);
}


function testExec_SkipMoreThanResults() {
  return checkExec(/* sampleDataCount */ 20, /* skip */ 100);
}


function testExec_SkipEqualToResults() {
  return checkExec(/* sampleDataCount */ 20, /* skip */ 20);
}


function testExec_SkipZero() {
  return checkExec(/* sampleDataCount */ 20, /* skip */ 0);
}


/**
 * Checks that the returned results do not include skipped rows.
 * @param {number} sampleDataCount The total number of rows available.
 * @param {number} skip The number of rows to be skipped.
 * @return {!IThenable}
 */
function checkExec(sampleDataCount, skip) {
  var rows = generateSampleRows(sampleDataCount);
  var tableName = 'dummyTable';
  var childStep = new lf.proc.NoOpStep([
    lf.proc.Relation.fromRows(rows, [tableName])]);

  var queryContext = new lf.query.SelectContext(schema);
  queryContext.skip = skip;
  var step = new lf.proc.SkipStep();
  step.addChild(childStep);

  return step.exec(undefined, queryContext).then(function(relations) {
    var relation = relations[0];
    var expectedResults = Math.max(sampleDataCount - skip, 0);
    assertEquals(expectedResults, relation.entries.length);
    if (expectedResults > 0) {
      // Check that the skipped results are not returned.
      for (var i = 0; i < expectedResults; i++) {
        assertEquals(
            'id' + String(skip + i),
            relation.entries[i].row.payload().id);
      }
    }
  });
}


/**
 * Generates sample data for testing.
 * @param {number} rowCount The number of sample rows to be generated.
 * @return {!Array<!lf.Row>}
 */
function generateSampleRows(rowCount) {
  var rows = new Array(rowCount);

  for (var i = 0; i < rowCount; i++) {
    rows[i] = lf.Row.create({
      'id': 'id' + i.toString()
    });
  }

  return rows;
}
