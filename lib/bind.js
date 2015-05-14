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
goog.provide('lf.Binder');
goog.provide('lf.bind');


/**
 * @param {number} index Position in bound array.
 * @return {!lf.Binder}
 * @export
 */
lf.bind = function(index) {
  return new lf.Binder(index);
};



/**
 * Binder class that instructs the query engine to evaluate bound value at
 * execution time.
 * @param {number} index
 * @constructor
 * @struct
 * @final
 * @export
 */
lf.Binder = function(index) {
  /** @private {number} */
  this.index_ = index;
};


/** @return {number} */
lf.Binder.prototype.getIndex = function() {
  return this.index_;
};
