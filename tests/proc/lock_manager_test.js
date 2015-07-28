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
goog.setTestOnly();
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.proc.LockManager');
goog.require('lf.proc.LockType');
goog.require('lf.structs.set');


/** @type {!lf.structs.Set<!hr.db.schema.Job>} */
var j;


/** @type {!lf.proc.LockManager} */
var lockManager;


function setUp() {
  j = lf.structs.set.create();
  j.add(hr.db.getSchema().getJob());
  lockManager = new lf.proc.LockManager();
}


function testRequestLock_SharedLocksOnly() {
  for (var i = 0; i < 10; i++) {
    var taskId = i;
    // SHARED lock can't be granted if RESERVED_READ_ONLY has not been already
    // granted.
    assertFalse(lockManager.requestLock(taskId, j, lf.proc.LockType.SHARED));
    assertTrue(lockManager.requestLock(taskId, j,
        lf.proc.LockType.RESERVED_READ_ONLY));
    assertTrue(lockManager.requestLock(taskId, j, lf.proc.LockType.SHARED));
  }
}


function testRequestLock_ReservedReadWriteLocksOnly() {
  var dataItems = j;

  // Granting the lock to a single task.
  var reservedLockId = 0;
  assertTrue(lockManager.requestLock(
      reservedLockId, dataItems, lf.proc.LockType.RESERVED_READ_WRITE));

  // Expecting lock to be denied.
  for (var i = 1; i < 5; i++) {
    var taskId = i;
    assertFalse(lockManager.requestLock(
        taskId, dataItems, lf.proc.LockType.RESERVED_READ_WRITE));
  }

  // Releasing the lock.
  lockManager.releaseLock(reservedLockId, dataItems);

  // Expecting the lock to be granted again.
  assertTrue(lockManager.requestLock(
      1, dataItems, lf.proc.LockType.RESERVED_READ_WRITE));
}


function testRequestLock_ExclusiveLocksOnly() {
  var dataItems = j;

  // EXCLUSIVE lock can't be granted if RESERVED_READ_WRITE has not been
  // already granted.
  assertFalse(lockManager.requestLock(
      0, dataItems, lf.proc.LockType.EXCLUSIVE));
  assertTrue(lockManager.requestLock(
      0, dataItems, lf.proc.LockType.RESERVED_READ_WRITE));
  assertTrue(lockManager.requestLock(0, dataItems, lf.proc.LockType.EXCLUSIVE));

  assertTrue(lockManager.requestLock(
      1, dataItems, lf.proc.LockType.RESERVED_READ_WRITE));
  // An EXCLUSIVE lock can't be granted, already held by taskId 0.
  assertFalse(
      lockManager.requestLock(1, dataItems,
      lf.proc.LockType.EXCLUSIVE));

  lockManager.releaseLock(0, dataItems);

  // RESERVED_READ_WRITE lock is already being held. Calling requestLock()
  // should still return true for such cases.
  assertTrue(lockManager.requestLock(
      1, dataItems, lf.proc.LockType.RESERVED_READ_WRITE));
  // EXCLUSIVE lock can now be granted, since taskId 0 has released it.
  assertTrue(
      lockManager.requestLock(1, dataItems,
      lf.proc.LockType.RESERVED_READ_WRITE));
}


/**
 * Checks that for a given resource,
 * 1) RESERVED_READ_ONLY, SHARED locks can't be granted if a RESERVED_READ_WRITE
 *   lock has already been granted.
 * 2) RESERVED_READ_ONLY, SHARED locks can be granted after a previously granted
 *    RESERVED_READ_WRITE lock is released.
 */
function testRequestLock_SharedReserved() {
  var dataItems = j;

  // Granting SHARED locks to a bunch of tasks.
  for (var i = 0; i < 10; i++) {
    var taskId = i;
    assertTrue(lockManager.requestLock(taskId, j,
        lf.proc.LockType.RESERVED_READ_ONLY));
    assertTrue(lockManager.requestLock(taskId, j, lf.proc.LockType.SHARED));
  }

  // Granting a reserved lock to a single task.
  var reservedLockId = i + 1;
  assertTrue(lockManager.requestLock(
      reservedLockId, dataItems, lf.proc.LockType.RESERVED_READ_WRITE));

  // Expecting that no new SHARED locks can be granted.
  for (var i = 20; i < 30; i++) {
    var taskId = i;
    assertFalse(lockManager.requestLock(taskId, j,
        lf.proc.LockType.RESERVED_READ_ONLY));
    assertFalse(lockManager.requestLock(taskId, j, lf.proc.LockType.SHARED));
  }

  // Releasing RESERVED_READ_WRITE lock.
  lockManager.releaseLock(reservedLockId, dataItems);

  // Expecting new SHARED locks to be successfully granted.
  for (var i = 20; i < 30; i++) {
    var taskId = i;
    assertTrue(lockManager.requestLock(taskId, j,
        lf.proc.LockType.RESERVED_READ_ONLY));
    assertTrue(lockManager.requestLock(taskId, j, lf.proc.LockType.SHARED));
  }
}


/**
 * Checks that for a given resource,
 * 1) a RESERVED_READ_WRITE lock can be granted even if an EXCLUSIVE lock has
 *    already been granted.
 * 2) an EXCLUSIVE lock can be granted, after a previous task releases it.
 */
function testRequestLock_ReservedExclusive() {
  var dataItems = j;
  var taskId = 0;
  assertTrue(lockManager.requestLock(
      taskId, dataItems, lf.proc.LockType.RESERVED_READ_WRITE));
  assertTrue(lockManager.requestLock(
      taskId, dataItems, lf.proc.LockType.EXCLUSIVE));

  for (var i = 1; i < 5; i++) {
    taskId = i;
    // Acquiring RESERVED_READ_WRITE lock once.
    assertTrue(lockManager.requestLock(
        taskId, dataItems, lf.proc.LockType.RESERVED_READ_WRITE));
    // Ensuring that RESERVED_READ_WRITE lock is re-entrant.
    assertTrue(lockManager.requestLock(
        taskId, dataItems, lf.proc.LockType.RESERVED_READ_WRITE));

    // Expecting EXCLUSIVE lock to be denied since it is held by the previous
    // taskId.
    assertFalse(lockManager.requestLock(
        taskId, dataItems, lf.proc.LockType.EXCLUSIVE));
    lockManager.releaseLock(taskId - 1, dataItems);

    // Expecting EXCLUSIVE lock to be granted since it was released by the
    // previous taskId.
    assertTrue(lockManager.requestLock(
        taskId, dataItems, lf.proc.LockType.EXCLUSIVE));
  }
}


/**
 * Checks that for a given resource,
 * 1) a SHARED lock can't be granted if an EXCLUSIVE lock has already been
 *    granted.
 * 2) an EXCLUSIVE can't be granted if SHARED locks have already been granted.
 */
function testRequestLock_SharedExclusive() {
  var dataItems = j;

  var exclusiveLockId = 0;
  assertTrue(lockManager.requestLock(
      exclusiveLockId, dataItems, lf.proc.LockType.RESERVED_READ_WRITE));
  assertTrue(lockManager.requestLock(
      exclusiveLockId, dataItems, lf.proc.LockType.EXCLUSIVE));

  for (var i = 1; i < 5; i++) {
    var taskId = i;
    assertTrue(lockManager.requestLock(
        taskId, dataItems, lf.proc.LockType.RESERVED_READ_ONLY));
    assertFalse(lockManager.requestLock(
        taskId, dataItems, lf.proc.LockType.SHARED));
  }

  lockManager.releaseLock(exclusiveLockId, dataItems);

  for (var i = 1; i < 5; i++) {
    var taskId = i;
    // RESERVED_READ_ONLY lock is already being held. Calling requestLock()
    // should still return true for such cases.
    assertTrue(lockManager.requestLock(
        taskId, dataItems, lf.proc.LockType.RESERVED_READ_ONLY));
    assertTrue(lockManager.requestLock(
        taskId, dataItems, lf.proc.LockType.SHARED));
  }

  // Ensuring that a RESERVED_READ_WRITE lock can be granted, but can't be
  // escalated yet to an EXCLUSIVE.
  assertTrue(lockManager.requestLock(
      exclusiveLockId, dataItems, lf.proc.LockType.RESERVED_READ_WRITE));
  assertFalse(lockManager.requestLock(
      exclusiveLockId, dataItems, lf.proc.LockType.EXCLUSIVE));
}
