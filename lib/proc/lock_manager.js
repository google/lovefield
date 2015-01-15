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
goog.provide('lf.proc.LockManager');
goog.provide('lf.proc.LockType');

goog.require('goog.structs.Map');
goog.require('goog.structs.Set');



/**
 * LockManager is responsible for granting locks to tasks. Each lock corresponds
 * to a database table.
 *
 * Three types of locks exist, SHARED, RESERVED and EXCLUSIVE, in order to
 * implement a two-phase locking algorithm.
 * 1) SHARED: Multiple shared locks can be granted (meant to be used by
 *    READ_ONLY tasks).
 * 2) RESERVED: Granted to a single READ_WRITE task. It prevents further SHARED
 *    or RESERVED locks to be granted, but the underlying table should not be
 *    modified yet, until the lock is escalated to an EXCLUSIVE lock.
 * 3) EXCLUSIVE: Granted to a single READ_WRITE task. It prevents further
 *    SHARED or EXCLUSIVE locks to be granted. It is OK to modify a table while
 *    holding such a lock.
 *
 * @constructor
 * @struct
 * @final
 */
lf.proc.LockManager = function() {
  /**
   * @private {!goog.structs.Map<string, !lf.proc.LockTableEntry_>}
   */
  this.lockTable_ = new goog.structs.Map();
};


/**
 * The types of locks that exist.
 * @enum {number}
 */
lf.proc.LockType = {
  EXCLUSIVE: 0,
  RESERVED: 1,
  SHARED: 2
};


/**
 * @param {!lf.schema.Table} dataItem
 * @return {!lf.proc.LockTableEntry_}
 * @private
 */
lf.proc.LockManager.prototype.getEntry_ = function(dataItem) {
  var lockTableEntry = this.lockTable_.get(dataItem.getName(), null);
  if (goog.isNull(lockTableEntry)) {
    lockTableEntry = new lf.proc.LockTableEntry_();
    this.lockTable_.set(dataItem.getName(), lockTableEntry);
  }
  return lockTableEntry;
};


/**
 * @param {number} taskId
 * @param {Array<!lf.schema.Table>} dataItems
 * @param {!lf.proc.LockType} lockType
 * @private
 */
lf.proc.LockManager.prototype.grantLock_ = function(
    taskId, dataItems, lockType) {
  dataItems.forEach(function(dataItem) {
    var lockTableEntry = this.getEntry_(dataItem);
    lockTableEntry.grantLock(taskId, lockType);
  }, this);
};


/**
 * @param {number} taskId
 * @param {!Array<!lf.schema.Table>} dataItems
 * @param {!lf.proc.LockType} lockType
 * @return {boolean} Whether the requested lock can be acquired.
 * @private
 */
lf.proc.LockManager.prototype.canAcquireLock_ = function(
    taskId, dataItems, lockType) {
  return dataItems.every(
      function(dataItem) {
        var lockTableEntry = this.getEntry_(dataItem);
        return lockTableEntry.canAcquireLock(taskId, lockType);
      }, this);
};


/**
 * @param {number} taskId
 * @param {!Array<!lf.schema.Table>} dataItems
 * @param {!lf.proc.LockType} lockType
 * @return {boolean} Whether the requsted lock was acquired.
 */
lf.proc.LockManager.prototype.requestLock = function(
    taskId, dataItems, lockType) {
  var canAcquireLock = this.canAcquireLock_(taskId, dataItems, lockType);
  if (canAcquireLock) {
    this.grantLock_(taskId, dataItems, lockType);
  }
  return canAcquireLock;
};


/**
 * @param {number} taskId
 * @param {Array<!lf.schema.Table>} dataItems
 */
lf.proc.LockManager.prototype.releaseLock = function(taskId, dataItems) {
  dataItems.forEach(
      function(dataItem) {
        var lockTableEntry = this.getEntry_(dataItem);
        lockTableEntry.releaseLock(taskId);
      }, this);
};


/**
 * Removes any reserved locks for the given data items. This is needed in order
 * ot prioritize a taskId higher than a taskId that already holds a reserved
 * lock.
 * @param {Array<!lf.schema.Table>} dataItems
 */
lf.proc.LockManager.prototype.clearReservedLocks = function(dataItems) {
  dataItems.forEach(
      function(dataItem) {
        var lockTableEntry = this.getEntry_(dataItem);
        lockTableEntry.reservedLock = null;
      }, this);
};



/**
 * @constructor
 * @struct
 * @final
 * @private
 */
lf.proc.LockTableEntry_ = function() {
  /** @type {?number} */
  this.exclusiveLock = null;

  /** @type {?number} */
  this.reservedLock = null;

  /** @type {?goog.structs.Set<number>} */
  this.sharedLocks = null;
};


/**
 * @param {number} taskId
 */
lf.proc.LockTableEntry_.prototype.releaseLock = function(taskId) {
  if (this.exclusiveLock == taskId) {
    this.exclusiveLock = null;
  }
  if (this.reservedLock == taskId) {
    this.reservedLock = null;
  }
  if (!goog.isNull(this.sharedLocks)) {
    this.sharedLocks.remove(taskId);
  }
};


/**
 * @param {number} taskId
 * @param {lf.proc.LockType} lockType
 * @return {boolean}
 */
lf.proc.LockTableEntry_.prototype.canAcquireLock = function(taskId, lockType) {
  if (lockType == lf.proc.LockType.EXCLUSIVE) {
    var noSharedLocksExist = goog.isNull(this.sharedLocks) ||
        this.sharedLocks.isEmpty();
    return noSharedLocksExist && goog.isNull(this.exclusiveLock) &&
        (goog.isNull(this.reservedLock) || this.reservedLock == taskId);
  } else if (lockType == lf.proc.LockType.SHARED) {
    return goog.isNull(this.exclusiveLock) && goog.isNull(this.reservedLock);
  } else {
    // Case of RESERVED lock.
    return goog.isNull(this.reservedLock) || this.reservedLock == taskId;
  }
};


/**
 * @param {number} taskId
 * @param {lf.proc.LockType} lockType
 */
lf.proc.LockTableEntry_.prototype.grantLock = function(taskId, lockType) {
  if (lockType == lf.proc.LockType.EXCLUSIVE) {
    // TODO(dpapad): Assert that reserved lock was held by this taskId.
    this.reservedLock = null;
    this.exclusiveLock = taskId;
  } else if (lockType == lf.proc.LockType.SHARED) {
    // TODO(dpapad): Assert that no other locked is held by this taskId and that
    // no reserved/exclusive locks exist.
    if (goog.isNull(this.sharedLocks)) {
      this.sharedLocks = new goog.structs.Set();
    }
    this.sharedLocks.add(taskId);
  } else {
    // Case of RESERVED lock.
    // TODO(dpapad): Any oter assertions here?
    this.reservedLock = taskId;
  }
};
