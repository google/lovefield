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
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.ConstraintAction');
goog.require('lf.schema.Info');
goog.require('lf.testing.hrSchema.getSchemaBuilder');


/** @type {!lf.schema.Info} */
var dynamicInfo;


/** @type {!lf.schema.Info} */
var staticInfo;


function setUp() {
  var builder = lf.testing.hrSchema.getSchemaBuilder();
  dynamicInfo = new lf.schema.Info(builder.getSchema());
  staticInfo = hr.db.getSchema().info();
}


function testGetReferencingForeignKeys() {
  /**
   * @param {!lf.schema.Info} info
   * @param {string} tableName
   * @param {!lf.ConstraintAction=} opt_constraintAction
   * @return {?Array<string>}
   */
  var getRefs = function(info, tableName, opt_constraintAction) {
    var refs = info.getReferencingForeignKeys(tableName, opt_constraintAction);
    return goog.isNull(refs) ? null : refs.map(function(ref) {
      return ref.name;
    });
  };

  [dynamicInfo, staticInfo].forEach(function(info) {
    assertNull(getRefs(info, 'DummyTable'));
    assertSameElements(['Country.fk_RegionId'], getRefs(info, 'Region'));
    assertSameElements(
        ['Country.fk_RegionId'],
        getRefs(info, 'Region', lf.ConstraintAction.RESTRICT));
    assertNull(getRefs(info, 'Region', lf.ConstraintAction.CASCADE));

    assertSameElements(['Location.fk_CountryId'], getRefs(info, 'Country'));
    assertSameElements(
        ['Location.fk_CountryId'],
        getRefs(info, 'Country', lf.ConstraintAction.RESTRICT));
    assertNull(getRefs(info, 'Country', lf.ConstraintAction.CASCADE));
  });
}


/**
 * @param {!Function} toTest Function to be tested.
 * @param {string|!Array<string>} arg
 * @return {!Array<string>}
 */
function invoke(toTest, arg) {
  return toTest(arg).map(function(table) {
    return table.getName();
  });
}


function testGetParentTables() {
  [dynamicInfo, staticInfo].forEach(function(info) {
    var toTest = info.getParentTables.bind(info);
    assertEquals(0, invoke(toTest, 'Region').length);
    assertSameElements(['Region'], invoke(toTest, 'Country'));
    assertSameElements(['Country'], invoke(toTest, 'Location'));
  });
}


function testGetParentTablesByColumns() {
  [dynamicInfo, staticInfo].forEach(function(info) {
    var toTest = info.getParentTablesByColumns.bind(info);
    assertEquals(0, invoke(toTest, []).length);
    assertEquals(0, invoke(toTest, ['DummyTable.arraybuffer']).length);
    assertSameElements(['Job'], invoke(toTest, ['Employee.jobId']));
    assertSameElements(
        ['Department', 'Job'],
        invoke(toTest, ['Employee.jobId', 'Employee.departmentId']));
  });
}


function testGetChildTables_All() {
  [dynamicInfo, staticInfo].forEach(function(info) {
    var toTest = info.getChildTables.bind(info);
    assertEquals(0, invoke(toTest, 'DummyTable').length);
    assertSameElements(['Country'], invoke(toTest, 'Region'));
    assertSameElements(['Location'], invoke(toTest, 'Country'));
  });
}


function testGetChildTables_Restrict() {
  [dynamicInfo, staticInfo].forEach(function(info) {
    var jobChildren = info.getChildTables('Job', lf.ConstraintAction.RESTRICT);
    assertEquals(1, jobChildren.length);
    assertEquals('Employee', jobChildren[0].getName());
    var employeeChildren = info.getChildTables(
        'Employee', lf.ConstraintAction.RESTRICT);
    assertEquals(1, employeeChildren.length);
    assertEquals('JobHistory', employeeChildren[0].getName());
  });
}


function testGetChildTables_Cascade() {
  [dynamicInfo, staticInfo].forEach(function(info) {
    var jobChildren = info.getChildTables('Job', lf.ConstraintAction.CASCADE);
    assertEquals(0, jobChildren.length);

    var employeeChildren = info.getChildTables(
        'Employee', lf.ConstraintAction.CASCADE);
    assertEquals(0, employeeChildren.length);
  });
}


function testGetChildTablesByColumns() {
  [dynamicInfo, staticInfo].forEach(function(info) {
    var toTest = info.getChildTablesByColumns.bind(info);
    assertEquals(0, invoke(toTest, []).length);
    assertEquals(0, invoke(toTest, ['DummyTable.arraybuffer']).length);
    assertSameElements(
        ['Employee', 'JobHistory'],
        invoke(toTest, ['Department.id']));
  });
}
