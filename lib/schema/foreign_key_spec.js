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
goog.provide('lf.schema.ForeignKeySpec');
goog.provide('lf.schema.RawForeignKeySpec');

goog.require('lf.Exception');

goog.forwardDeclare('lf.ConstraintAction');
goog.forwardDeclare('lf.ConstraintTiming');


/**
 * @typedef {{
 *   local: string,
 *   ref: string,
 *   action: (lf.ConstraintAction|undefined),
 *   timing: (lf.ConstraintTiming|undefined)
 * }}
 */
lf.schema.RawForeignKeySpec;



/**
 * Representation of foreign key specs
 * @constructor @struct
 *
 * @param {!lf.schema.RawForeignKeySpec} rawSpec
 * @param {string} childTable Name of the child table.
 * @param {string} name Name of this foreign key constraint.
 */
lf.schema.ForeignKeySpec = function(rawSpec, childTable, name) {
  var array = rawSpec['ref'].split('.');
  if (array.length != 2) {
    // 540: Foreign key {0} has invalid reference syntax.
    throw new lf.Exception(540, name);
  }

  /** @type {string} */
  this.childTable = childTable;

  /** @type {string} */
  this.childColumn = rawSpec['local'];

  /** @type {string} */
  this.parentTable = array[0];

  /** @type {string} */
  this.parentColumn = array[1];

  /**
   * Normalized name of this foreign key constraint.
   * @type {string}
   */
  this.name = childTable + '.' + name;

  /** @type {lf.ConstraintAction} */
  this.action = rawSpec['action'];

  /** @type {lf.ConstraintTiming} */
  this.timing = rawSpec['timing'];
};
