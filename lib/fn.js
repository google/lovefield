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
goog.provide('lf.fn');
goog.provide('lf.fn.Type');

goog.require('lf.fn.AggregatedColumn');
goog.require('lf.fn.StarColumn');

goog.forwardDeclare('lf.schema.BaseColumn');


/**
 * An enum holding all function types.
 * @enum {string}
 */
lf.fn.Type = {
  AVG: 'AVG',
  COUNT: 'COUNT',
  DISTINCT: 'DISTINCT',
  GEOMEAN: 'GEOMEAN',
  MAX: 'MAX',
  MIN: 'MIN',
  STDDEV: 'STDDEV',
  SUM: 'SUM'
};


/**
 * @export
 * @param {!lf.schema.Column} col
 * @return {!lf.schema.Column}
 */
lf.fn.avg = function(col) {
  return new lf.fn.AggregatedColumn(col, lf.fn.Type.AVG);
};


/**
 * @export
 * @param {!lf.schema.Column=} opt_col
 * @return {!lf.schema.Column}
 */
lf.fn.count = function(opt_col) {
  var col = opt_col || new lf.fn.StarColumn();
  return new lf.fn.AggregatedColumn(col, lf.fn.Type.COUNT);
};


/**
 * @export
 * @param {!lf.schema.BaseColumn} col
 * @return {!lf.schema.Column}
 */
lf.fn.distinct = function(col) {
  return new lf.fn.AggregatedColumn(col, lf.fn.Type.DISTINCT);
};


/**
 * @export
 * @param {!lf.schema.Column} col
 * @return {!lf.schema.Column}
 */
lf.fn.max = function(col) {
  return new lf.fn.AggregatedColumn(col, lf.fn.Type.MAX);
};


/**
 * @export
 * @param {!lf.schema.Column} col
 * @return {!lf.schema.Column}
 */
lf.fn.min = function(col) {
  return new lf.fn.AggregatedColumn(col, lf.fn.Type.MIN);
};


/**
 * @export
 * @param {!lf.schema.Column} col
 * @return {!lf.schema.Column}
 */
lf.fn.stddev = function(col) {
  return new lf.fn.AggregatedColumn(col, lf.fn.Type.STDDEV);
};


/**
 * @export
 * @param {!lf.schema.Column} col
 * @return {!lf.schema.Column}
 */
lf.fn.sum = function(col) {
  return new lf.fn.AggregatedColumn(col, lf.fn.Type.SUM);
};


/**
 * @export
 * @param {!lf.schema.Column} col
 * @return {!lf.schema.Column}
 */
lf.fn.geomean = function(col) {
  return new lf.fn.AggregatedColumn(col, lf.fn.Type.GEOMEAN);
};
