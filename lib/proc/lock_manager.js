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
goog.provide('lf.proc.LockManager');
goog.provide('lf.proc.LockType');

goog.require('lf.structs.map');
goog.require('lf.structs.set');



/**
 * LockManager is responsible for granting locks to tasks. Each lock corresponds
 * to a database table.
 *
 * Four types of locks exist in order to implement a two-phase locking
 * algorithm.
 * 1) RESERVED_READ_ONLY: Multiple such locks can be granted. It prevents any
 *    RESERVED_READ_WRITE and EXCLUSIVE locks from being granted. It needs to be
 *    acquired by any task that wants to eventually escalate it to a SHARED
 *    lock.
 * 2) SHARED: Multiple shared locks can be granted (meant to be used by
 *    READ_ONLY tasks). Such tasks must be already holding a RESERVED_READ_ONLY
 *    lock.
 * 3) RESERVED_READ_WRITE: Granted to a single READ_WRITE task. It prevents
 *    further SHARED, RESERVED_READ_ONLY and RESERVED_READ_WRITE locks to be
 *    granted, but the underlying table should not be modified yet, until the
 *    lock is escalated to an EXCLUSIVE lock.
 * 4) EXCLUSIVE: Granted to a single READ_WRITE task. That task must already be
 *    holding a RESERVED_READ_WRITE lock. It prevents further SHARED or
 *    EXCLUSIVE locks to be granted. It is OK to modify a table while holding
 *    such a lock.
 *
 * @constructor
 * @struct
 * @final
 */
lf.proc.LockManager = function() {
  /**
   * @private {!lf.structs.Map<string, !lf.proc.LockTableEntry_>}
   */
  this.lockTable_ = lf.structs.map.create();
};


/**
 * The types of locks that exist.
 * @enum {number}
 */
lf.proc.LockType = {
  EXCLUSIVE: 0,
  RESERVED_READ_ONLY: 1,
  RESERVED_READ_WRITE: 2,
  SHARED: 3
};


/**
 * @param {!lf.schema.Table} dataItem
 * @return {!lf.proc.LockTableEntry_}
 * @private
 */
lf.proc.LockManager.prototype.getEntry_ = function(dataItem) {
  var lockTableEntry = this.lockTable_.get(dataItem.getName()) || null;
  if (goog.isNull(lockTableEntry)) {
    lockTableEntry = new lf.proc.LockTableEntry_();
    this.lockTable_.set(dataItem.getName(), lockTableEntry);
  }
  return lockTableEntry;
};


/**
 * @param {number} taskId
 * @param {!lf.structs.Set<!lf.schema.Table>} dataItems
 * @param {!lf.proc.LockType} lockType
 * @private
 */
lf.proc.LockManager.prototype.grantLock_ = function(
    taskId, dataItems, lockType) {
  dataItems.forEach(
      /** @this {!lf.proc.LockManager} */
      function(dataItem) {
        var lockTableEntry = this.getEntry_(dataItem);
        lockTableEntry.grantLock(taskId, lockType);
      }, this);
};


/**
 * @param {number} taskId
 * @param {!lf.structs.Set<!lf.schema.Table>} dataItems
 * @param {!lf.proc.LockType} lockType
 * @return {boolean} Whether the requested lock can be acquired.
 * @private
 */
lf.proc.LockManager.prototype.canAcquireLock_ = function(
    taskId, dataItems, lockType) {
  var canAcquireLock = true;
  dataItems.forEach(
      /** @this {!lf.proc.LockManager} */
      function(dataItem) {
        if (canAcquireLock) {
          var lockTableEntry = this.getEntry_(dataItem);
          canAcquireLock = lockTableEntry.canAcquireLock(taskId, lockType);
        }
      }, this);
  return canAcquireLock;
};


/**
 * @param {number} taskId
 * @param {!lf.structs.Set<!lf.schema.Table>} dataItems
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
 * @param {!lf.structs.Set<!lf.schema.Table>} dataItems
 */
lf.proc.LockManager.prototype.releaseLock = function(taskId, dataItems) {
  dataItems.forEach(
      /** @this {!lf.proc.LockManager} */
      function(dataItem) {
        var lockTableEntry = this.getEntry_(dataItem);
        lockTableEntry.releaseLock(taskId);
      }, this);
};


/**
 * Removes any reserved locks for the given data items. This is needed in order
 * ot prioritize a taskId higher than a taskId that already holds a reserved
 * lock.
 * @param {!lf.structs.Set<!lf.schema.Table>} dataItems
 */
lf.proc.LockManager.prototype.clearReservedLocks = function(dataItems) {
  dataItems.forEach(
      /** @this {!lf.proc.LockManager} */
      function(dataItem) {
        var lockTableEntry = this.getEntry_(dataItem);
        lockTableEntry.reservedReadWriteLock = null;
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
  this.reservedReadWriteLock = null;

  /** @type {?lf.structs.Set<number>} */
  this.reservedReadOnlyLocks = null;

  /** @type {?lf.structs.Set<number>} */
  this.sharedLocks = null;
};


/**
 * @param {number} taskId
 */
lf.proc.LockTableEntry_.prototype.releaseLock = function(taskId) {
  if (this.exclusiveLock == taskId) {
    this.exclusiveLock = null;
  }
  if (this.reservedReadWriteLock == taskId) {
    this.reservedReadWriteLock = null;
  }
  if (!goog.isNull(this.reservedReadOnlyLocks)) {
    this.reservedReadOnlyLocks.delete(taskId);
  }
  if (!goog.isNull(this.sharedLocks)) {
    this.sharedLocks.delete(taskId);
  }
};


/**
 * @param {number} taskId
 * @param {lf.proc.LockType} lockType
 * @return {boolean}
 */
lf.proc.LockTableEntry_.prototype.canAcquireLock = function(taskId, lockType) {
  var noReservedReadOnlyLocksExist = goog.isNull(this.reservedReadOnlyLocks) ||
      this.reservedReadOnlyLocks.size == 0;

  if (lockType == lf.proc.LockType.EXCLUSIVE) {
    var noSharedLocksExist = goog.isNull(this.sharedLocks) ||
        this.sharedLocks.size == 0;
    return noSharedLocksExist && noReservedReadOnlyLocksExist &&
        goog.isNull(this.exclusiveLock) &&
        !goog.isNull(this.reservedReadWriteLock) &&
        this.reservedReadWriteLock == taskId;
  } else if (lockType == lf.proc.LockType.SHARED) {
    return goog.isNull(this.exclusiveLock) &&
        goog.isNull(this.reservedReadWriteLock) &&
        !goog.isNull(this.reservedReadOnlyLocks) &&
        this.reservedReadOnlyLocks.has(taskId);
  } else if (lockType == lf.proc.LockType.RESERVED_READ_ONLY) {
    return goog.isNull(this.reservedReadWriteLock);
  } else { // case of lockType == lf.proc.LockType.RESERVED_READ_WRITE
    return noReservedReadOnlyLocksExist &&
        (goog.isNull(this.reservedReadWriteLock) ||
         this.reservedReadWriteLock == taskId);
  }
};


/**
 * @param {number} taskId
 * @param {lf.proc.LockType} lockType
 */
lf.proc.LockTableEntry_.prototype.grantLock = function(taskId, lockType) {
  if (lockType == lf.proc.LockType.EXCLUSIVE) {
    // TODO(dpapad): Assert that reserved lock was held by this taskId.
    this.reservedReadWriteLock = null;
    this.exclusiveLock = taskId;
  } else if (lockType == lf.proc.LockType.SHARED) {
    // TODO(dpapad): Assert that no other locked is held by this taskId and that
    // no reserved/exclusive locks exist.
    if (goog.isNull(this.sharedLocks)) {
      this.sharedLocks = lf.structs.set.create();
    }
    this.sharedLocks.add(taskId);

    if (goog.isNull(this.reservedReadOnlyLocks)) {
      this.reservedReadOnlyLocks = lf.structs.set.create();
    }
    this.reservedReadOnlyLocks.delete(taskId);
  } else if (lockType == lf.proc.LockType.RESERVED_READ_ONLY) {
    if (goog.isNull(this.reservedReadOnlyLocks)) {
      this.reservedReadOnlyLocks = lf.structs.set.create();
    }
    this.reservedReadOnlyLocks.add(taskId);
  } else if (lockType == lf.proc.LockType.RESERVED_READ_WRITE) {
    // TODO(dpapad): Any other assertions here?
    this.reservedReadWriteLock = taskId;
  }
};
