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
goog.setTestOnly();
goog.require('goog.Promise');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.proc.LockManager');
goog.require('lf.proc.LockType');


/** @type {!hr.db.schema.Job} */
var j;


/** @type {!lf.proc.LockManager} */
var lockManager;


function setUp() {
  j = hr.db.getSchema().getJob();
  lockManager = new lf.proc.LockManager();
}


function testRequestLock_SharedLocksOnly() {
  for (var i = 0; i < 10; i++) {
    var taskId = i;
    assertTrue(lockManager.requestLock(taskId, [j], lf.proc.LockType.SHARED));
  }
}


function testRequestLock_ReservedLocksOnly() {
  checkSingleLockHolder(lf.proc.LockType.RESERVED);
}


function testRequestLock_ExclusiveLocksOnly() {
  checkSingleLockHolder(lf.proc.LockType.EXCLUSIVE);
}


/**
 * Checks that locks of the given type can only be granted to a single task at a
 * time.
 * @param {!lf.proc.LockType} lockType
 */
function checkSingleLockHolder(lockType) {
  var dataItems = [j];

  // Granting the lock to a single task.
  var reservedLockId = 0;
  assertTrue(lockManager.requestLock(
      reservedLockId, dataItems, lockType));

  // Expecting lock to be denied.
  for (var i = 1; i < 5; i++) {
    var taskId = i;
    assertFalse(lockManager.requestLock(
        taskId, dataItems, lockType));
  }

  // Releasing the lock.
  lockManager.releaseLock(reservedLockId, dataItems);

  // Expecting the lock to be granted again.
  assertTrue(lockManager.requestLock(
      1, dataItems, lockType));
}


/**
 * Checks that for a given resource,
 * 1) SHARED locks can't be granted if a RESERVED lock has already been granted.
 * 2) SHARED locks can be granted after a previously granted RESERVED lock is
 *    released.
 */
function testRequestLock_SharedReserved() {
  var dataItems = [j];

  // Granting SHARED locks to a bunch of tasks.
  for (var i = 0; i < 10; i++) {
    var taskId = i;
    assertTrue(lockManager.requestLock(taskId, [j], lf.proc.LockType.SHARED));
  }

  // Granting a reserved lock to a single task.
  var reservedLockId = i + 1;
  assertTrue(lockManager.requestLock(
      reservedLockId, dataItems, lf.proc.LockType.RESERVED));

  // Expecting that no new SHARED locks can be granted.
  for (var i = 20; i < 30; i++) {
    var taskId = i;
    assertFalse(lockManager.requestLock(taskId, [j], lf.proc.LockType.SHARED));
  }

  // Releasing RESERVED lock.
  lockManager.releaseLock(reservedLockId, dataItems);

  // Expecting new SHARED locks to be successfully granted.
  for (var i = 20; i < 30; i++) {
    var taskId = i;
    assertTrue(lockManager.requestLock(taskId, [j], lf.proc.LockType.SHARED));
  }
}


/**
 * Checks that for a given resource,
 * 1) a RESERVED lock can be granted even if an EXCLUSIVE lock has already been
 *    granted.
 * 2) an EXCLUSIVE lock can be granted, after a previous task releases it.
 */
function testRequestLock_ReservedExclusive() {
  var dataItems = [j];
  var taskId = 0;
  assertTrue(lockManager.requestLock(
      taskId, dataItems, lf.proc.LockType.RESERVED));
  assertTrue(lockManager.requestLock(
      taskId, dataItems, lf.proc.LockType.EXCLUSIVE));

  for (var i = 1; i < 5; i++) {
    taskId = i;
    // Acquiring RESERVED lock once.
    assertTrue(lockManager.requestLock(
        taskId, dataItems, lf.proc.LockType.RESERVED));
    // Ensuring that RESERVED lock is re-entrant.
    assertTrue(lockManager.requestLock(
        taskId, dataItems, lf.proc.LockType.RESERVED));

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
  var dataItems = [j];

  var exclusiveLockId = 0;
  assertTrue(lockManager.requestLock(
      exclusiveLockId, dataItems, lf.proc.LockType.EXCLUSIVE));

  for (var i = 1; i < 5; i++) {
    var taskId = i;
    assertFalse(lockManager.requestLock(
        taskId, dataItems, lf.proc.LockType.SHARED));
  }

  lockManager.releaseLock(exclusiveLockId, dataItems);

  for (var i = 1; i < 5; i++) {
    var taskId = i;
    assertTrue(lockManager.requestLock(
        taskId, dataItems, lf.proc.LockType.SHARED));
  }

  assertFalse(lockManager.requestLock(
      exclusiveLockId, dataItems, lf.proc.LockType.EXCLUSIVE));
}
