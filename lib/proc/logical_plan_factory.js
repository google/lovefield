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
goog.provide('lf.proc.LogicalPlanFactory');

goog.require('lf.proc.DeleteLogicalPlanGenerator');
goog.require('lf.proc.DummyLogicalPlanGenerator');
goog.require('lf.proc.InsertLogicalPlanGenerator');
goog.require('lf.proc.SelectLogicalPlanGenerator');
goog.require('lf.proc.UpdateLogicalPlanGenerator');
goog.require('lf.query.DeleteContext');
goog.require('lf.query.InsertContext');
goog.require('lf.query.SelectContext');
goog.require('lf.query.UpdateContext');



/**
 * A factory used to create a logical query plan corresponding to a given query.
 * @constructor
 */
lf.proc.LogicalPlanFactory = function() {};


/**
 * @param {!lf.query.Query} query
 * @return {!lf.proc.LogicalQueryPlanNode}
 */
lf.proc.LogicalPlanFactory.prototype.create = function(query) {
  var generator = null;
  if (query instanceof lf.query.InsertContext) {
    generator = new lf.proc.InsertLogicalPlanGenerator(query);
  } else if (query instanceof lf.query.DeleteContext) {
    generator = new lf.proc.DeleteLogicalPlanGenerator(query);
  } else if (query instanceof lf.query.SelectContext) {
    generator = new lf.proc.SelectLogicalPlanGenerator(query);
  } else if (query instanceof lf.query.UpdateContext) {
    generator = new lf.proc.UpdateLogicalPlanGenerator(query);
  } else {
    generator = new lf.proc.DummyLogicalPlanGenerator(query);
  }

  return generator.generate();
};
