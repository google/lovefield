/**
 * @externs
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
 *
 * @fileoverview Temporary extern file for Firebase clients to compile. Once
 * Firebase has landed Google3, clients should directly reference the Closure-
 * annotated source.
 */



/**
 * @constructor
 * @param {string} url
 * @param {string=} opt_context
 * @see https://www.firebase.com/docs/web/api/firebase/constructor.html
 */
function Firebase(url, opt_context) {}


/**
 * @param {string} path
 * @return {!Firebase}
 */
Firebase.prototype.child;


/** @return {!Firebase} */
Firebase.prototype.parent;


/** @return {!Firebase} */
Firebase.prototype.root;


/** @return {string} */
Firebase.prototype.key;


/**
 * @param {?Object|string|number|boolean} value
 * @param {!Function=} opt_onComplete
 */
Firebase.prototype.set;


/**
 * @param {?Object} value
 * @param {!Function=} opt_onComplete
 */
Firebase.prototype.update;


/** @param {!Function=} opt_onComplete */
Firebase.prototype.remove;


/**
 * @param {(?Object|string|number|boolean)=} opt_value
 * @param {!Function=} opt_onComplete
 */
Firebase.prototype.push;


/**
 * @param {?Object|string|number|boolean} value
 * @param {string|number} priority
 * @param {!Function=} opt_onComplete
 */
Firebase.prototype.setWithPriority;


/**
 * @param {!Function} updateFunction
 * @param {!Function=} opt_onComplete
 * @param {!Function=} opt_applyLocally
 */
Firebase.prototype.transaction;


/**
 * @param {string} eventType
 * @param {!function(!DataSnapshot, string=)} callback
 * @param {!function(!Error)=} opt_cancelCallback
 * @param {!Object=} opt_context The "this" object for callbacks.
 * @return {!function(!DataSnapshot)} The function passed in as callback.
 */
Firebase.prototype.on;


/**
 * @param {string=} opt_eventType
 * @param {!Function=} opt_callback
 * @param {!Object=} opt_context The "this" object for callbacks.
 */
Firebase.prototype.off;


/**
 * @param {string} key
 * @return {!Firebase}
 */
Firebase.prototype.orderByChild;


/** @return {!Firebase} */
Firebase.prototype.orderByKey;


/**
 * @param {string|number|boolean} condition
 * @return {!Firebase}
 */
Firebase.prototype.equalTo;


/**
 * @param {string|number|boolean|null} value
 * @return {!Firebase}
 */
Firebase.prototype.startAt;


/**
 * @param {string} eventType
 * @param {!function(!DataSnapshot)} successCallback
 * @param {!function(!Error)=} opt_failureCallback
 * @param {!Object=} opt_context The "this" object for callbacks.
 */
Firebase.prototype.once;


/**
 * @param {string} token
 * @param {!function(?Error, ?Object)} onComplete
 */
Firebase.prototype.authWithCustomToken;


/** @type {!function()} */
Firebase.goOffline;


/**
 * @param {boolean} logger
 * @param {boolean} persistent
 */
Firebase.enableLogging;



/** @constructor */
function DataSnapshot() {}


/** @return {boolean} */
DataSnapshot.prototype.exists;


/** @return {null|boolean|number|string|!Object} */
DataSnapshot.prototype.val;


/**
 * @param {string} childPath
 * @return {!DataSnapshot}
 */
DataSnapshot.prototype.child;


/**
 * @param {!function(!DataSnapshot):(boolean|undefined)} childAction
 * @return {boolean|undefined}
 */
DataSnapshot.prototype.forEach;


/**
 * @param {string} childPath
 * @return {boolean}
 */
DataSnapshot.prototype.hasChild;


/** @return {boolean} */
DataSnapshot.prototype.hasChildren;


/** @return {string} */
DataSnapshot.prototype.key;


/** @return {string} */
DataSnapshot.prototype.name;


/** @return {number} */
DataSnapshot.prototype.numChilren;


/** @return {!Firebase} */
DataSnapshot.prototype.ref;


/** @return {string|number|null} */
DataSnapshot.prototype.getPriority;


/** @return {!Object} */
DataSnapshot.prototype.exportVal;
