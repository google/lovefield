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
goog.provide('lf.Capability');

goog.require('goog.labs.userAgent.browser');
goog.require('goog.userAgent');
goog.require('goog.userAgent.platform');
goog.require('goog.userAgent.product');



/**
 * Capability object based on browser version.
 * @constructor @struct
 */
lf.Capability = function() {
  /**
   * User is using legacy Safari or WebView on iOS (< Version 10).
   * @private {boolean}
   */
  this.legacySafari_ =
      (goog.labs.userAgent.browser.isSafari() &&
       !goog.userAgent.isVersionOrHigher(10)) ||
      ((goog.userAgent.product.IPAD || goog.userAgent.product.IPHONE) &&
       !goog.userAgent.platform.isVersion(10));

  /**
   * IndexedDB support: usable IndexedDB on IE 10+, Chrome, Firefox.
   * @type {boolean}
   */
  this.indexedDb = !(this.legacySafari_ ||
      (goog.userAgent.product.IE && !goog.userAgent.isVersionOrHigher(10)));

  /**
   * Cannot obtain reliable LocalStorage event on IE10, so disable it.
   * @type {boolean}
   */
  this.localStorageEvent = !(
      goog.userAgent.product.IE &&
      !goog.userAgent.isVersionOrHigher(11));

  /**
   * WebSQL is supported by Safari and Chrome only.
   * @type {boolean}
   */
  this.webSql = goog.labs.userAgent.browser.isChrome() ||
      goog.labs.userAgent.browser.isSafari();

  /**
   * Supports native Map. Safari and iOS Chrome shall use polyfill.
   * @type {boolean}
   */
  this.nativeMap = goog.isDef(window.Map) &&
      goog.isDef(window.Map.prototype.values) &&
      goog.isDef(window.Map.prototype.forEach) &&
      !this.legacySafari_;

  /**
   * Supports native Set. Safari and iOS Chrome shall use polyfill.
   * @type {boolean}
   */
  this.nativeSet = goog.isDef(window.Set) &&
      goog.isDef(window.Set.prototype.values) &&
      goog.isDef(window.Set.prototype.forEach) &&
      !this.legacySafari_;
};


/** @return {!lf.Capability} */
lf.Capability.get = function() {
  if (!goog.isDef(lf.Capability.instance_)) {
    lf.Capability.instance_ = new lf.Capability();
  }
  return lf.Capability.instance_;
};


/** @private {!lf.Capability} */
lf.Capability.instance_;
