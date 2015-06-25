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
goog.provide('lf.ConstraintAction');
goog.provide('lf.ConstraintTiming');
goog.provide('lf.Order');
goog.provide('lf.Type');
goog.provide('lf.type');


/** @export @enum {number} */
lf.ConstraintAction = {};


/** @export */
lf.ConstraintAction.RESTRICT = /** @type {!lf.ConstraintAction} */ (0);


/** @export */
lf.ConstraintAction.CASCADE = /** @type {!lf.ConstraintAction} */ (1);


/** @export @enum {number} */
lf.ConstraintTiming = {};


/** @export */
lf.ConstraintTiming.IMMEDIATE = /** @type {!lf.ConstraintTiming} */ (0);


/** @export */
lf.ConstraintTiming.DEFERRABLE = /** @type {!lf.ConstraintTiming} */ (1);


/** @export @enum {number} */
lf.Order = {};


/** @export */
lf.Order.DESC = /** @type {!lf.Order} */ (0);


/** @export */
lf.Order.ASC = /** @type {!lf.Order} */ (1);


/** @export @enum {number} */
lf.Type = {};


/**
 * NOTE: Defining each enum value separately is the only way to make the
 * compiler export each enum property.
 * @export
 */
lf.Type.ARRAY_BUFFER = /** @type {!lf.Type} */ (0);


/** @export */
lf.Type.BOOLEAN = /** @type {!lf.Type} */ (1);


/** @export */
lf.Type.DATE_TIME = /** @type {!lf.Type} */ (2);


/** @export */
lf.Type.INTEGER = /** @type {!lf.Type} */ (3);


/** @export */
lf.Type.NUMBER = /** @type {!lf.Type} */ (4);


/** @export */
lf.Type.STRING = /** @type {!lf.Type} */ (5);


/** @export */
lf.Type.OBJECT = /** @type {!lf.Type} */ (6);


/** @export @const */
lf.type.DEFAULT_VALUES = {
  0: null,  // lf.Type.ARRAY_BUFFER
  1: false,  // lf.Type.BOOLEAN
  2: Object.freeze(new Date(0)),  // lf.Type.DATE_TIME
  3: 0,  // lf.Type.INTEGER
  4: 0,  // lf.Type.NUMBER
  5: '',  // lf.Type.STRING
  6: null  // lf.Type.OBJECT
};
