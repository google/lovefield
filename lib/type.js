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
goog.provide('lf.Type');
goog.provide('lf.type');


/** @export @enum {number} */
lf.Type = {
  ARRAY_BUFFER: 0,
  BOOLEAN: 1,
  DATE_TIME: 2,
  INTEGER: 3,
  NUMBER: 4,
  STRING: 5,
  OBJECT: 6
};


/** @export @const */
lf.type.DEFAULT_VALUES = {
  0: new ArrayBuffer(0),  // lf.Type.ARRAY_BUFFER
  1: false,  // lf.Type.BOOLEAN
  2: Object.freeze(new Date(0)),  // lf.Type.DATE_TIME
  3: 0,  // lf.Type.INTEGER
  4: 0,  // lf.Type.NUMBER
  5: '',  // lf.Type.STRING
  6: Object.freeze({})  // lf.Type.OBJECT
};
