# Lovefield Specification

## 3. Life of a Lovefield Database

Lovefield database is scoped per-origin, like IndexedDB, so (origin, schema name) uniquely identify a database. The database is stored in a persistent storage (actual implementation uses IndexedDB because it's the only cross-browser persistent storage which meets our criteria).

### 3.1 Lovefield Initialization

The `getInstance()` method will implicitly invoke Lovefield initialization, which will load the known schema from persistent store. If Lovefield detected schema version mismatch, it will do the following:

* If schema version is newer than the library, throw an exception.
* If schema version is older than the library, perform database upgrade.

The `getInstance()` method is generated per schema and the version number associated with the schema is forged within. In most cases, `getInstance()` shall be called only once. There can be cases that two or more components calling `getInstance()` for a given database schema. If the code are generated from same version of schema, the second `getInstance()` will return the database object resulted from previous `getInstance()` call; if the code are generated from different versions, the second `getInstance()` will throw. If the first call is working on the `onUpgrade()` call, the second call won't return until the first call's `onUpgrade()` resolved.

#### 3.1.1 Testing Support

Persisting test data onto persistent storage in unit tests is generally not a good idea. It usually slows down the test, and also requires test infrastructure support for removing persisted data. In Lovefield, a testing support is provided to make sure all data are volatile. One can explicitly call

```js
db.getInstance(onUpgrade, /* opt_volatile */ true)
```

to force all data are stored and retrieve data from memory cache only. The `onUpgrade` can be replaced with undefined if the upgrade logic is not of interest.

### 3.2 Multi-Process Connection

Lovefield assumes that at a given time, there's only one Lovefield instance writing the database. However, by design the pair (origin, schema name) uniquely identify a database, there can be chances that multiple connections to the same database if there were multiple browser processes running same set of JavaScript.

Lovefield users shall be aware of this problem and plan accordingly. In Lovefield's current status, the query engine may have inconsistent in-memory snapshot if there are more than one connections making write request to the backing store. Lovefield will pursue W3C standardization to provide lower-level cache layer support and solve this issue in the future.

### 3.3 Database Upgrade

Lovefield will open the database using the version specified in schema (see [Schema Definition](01_schema.md)). When the version mismatch, the database upgrade mechanism will be triggered.

The first step of database upgrade is to create new tables. Lovefield checks the tables that are not in database but in the schema, and create them accordingly. After this is done, Lovefield will call the user-provided upgrade function.

User needs to provide the custom upgrade function as a parameter of `getInstance()` if the upgrade involves deleting or transforming table. The function will be given a raw database instance that is capable of doing table schema alternation. The function must return a promise. After the promise is resolved, a new database instance will be created and returned. If the promise is rejected, the `getInstance()` call will also be rejected.

Users do not need to worry about new indices or altering indices, either. Query engine will detect index schema change and recreate all the indices.

For the case of deleting table, user is responsible to perform the deletion in upgrade function. Lovefield does not provide auto-drop due to data safety concerns.

For the case of altering table, if the transformation is adding a nullable/fixed value column, or deleting a column, user can use helper functions provided, otherwise user needs to do row-by-row transformation. User is responsible for making sure the transformed rows will fit in new schema and does not violate constraints. Failing to do so may cause exceptions to be thrown during query execution. Lovefield disallows altering column types directly.

The following is a sample code snippet demonstrating database upgrades.

```js
lava.cr.db.getInstance(onUpgrade).then(
  /** @param {lf.Db} db */
  function(db) {
    // new db starts here
  });

/**
 * User provided upgrade function which is called after Lovefield
 * created new tables.
 *
 * NOTE: if the function incurs any asynchronous operations other
 * than working on the database, the upgrade transaction will be
 * committed immediately and very likely to fail the upgrade process
 * thanks to the IndexedDB auto-commit trap.
 * @param {lf.raw.BackStore} rawDb
 */
function onUpgrade(rawDb) {
  // Show the version currently persisted.
  console.log(rawDb.getVersion());

  // DROP TABLE Progress. This call is synchronous.
  rawDb.dropTable('Progress');

  // Add column agent (type string) to Purchase with default
  // value 'Smith'.
  var p1 = rawDb.addTableColumn('Purchase', 'agent', 'Smith');

  // Delete column metadata from Photo.
  var p2 = rawDb.dropTableColumn('Photo', 'metadata');

  // Transformations are not supported because of IndexedDB auto-
  // commmit: Firefox immediately committed the transaction when
  // Lovefield try to return a promise from scanning table. Users
  // are supposed to do a dump and make the transformation outside of
  // onUpgrade routine.

  // DUMP the whole DB into a JS object.
  var p3 = rawDb.dump();


  return Promise.all([p1, p2, p3]);
}
```

Users shall not assume that Lovefield will upgrade all data in-place. In certain circumstances, Lovefield may require to recreate a completely new database and copy the data over (which will be the last resort, for example, implementing a new and more efficient storage format). Since the database upgrade can be time-consuming, user is responsible for defining their own progress event and fire within the callback function.

### 3.4 Query Execution

If the schema version matches, or the database upgrade procedure completed, the resolve function of the returning promise will receive a database object. The database object can be used to run queries. The lifetime of a database object is the same as other JavaScript objects: if no one refers to it, garbage collector will have it. There is not an explicit close() call for it.

All queries must be created from the database object. All queries are not carried out until the `exec()` method is called. The `exec()` method will return a promise and will be carried out asynchronously.

#### 3.4.1 Transactions

All queries, unless called out specifically, are run in their own implicit transaction. Although queries return promises, and one can use it to replace transactions, there can be possible performance penalty since Lovefield may have flushed the data and have to delete them in rejection case.

The suggested way is to create transactions:

```js
// Assume query1 - query6 are read-only
// create a read-only transaction, any write op in it will fail.
var tx1 = db.createTransaction(lf.TransactionType.READ_ONLY);

// exec in order: query 1 first then query2, guaranteed snapshot
tx1.exec([query1, query2]);

// exec in order: query 3 first then query4
query3.exec().then(function() {
  query4.exec();
});

// exec in parallel (syntactically): tx1, query3, query5, query6
query5.exec();
query6.exec();

// default to read-write transaction
var tx2 = db.createTransaction(); 
tx2.exec([query7, query8]);
```

The `exec()` function of transaction also returns a promise, just like other queries. The difference is that the transaction guarantees all queries flush to persistent store atomically. If a transaction is created for `select()` queries, the `select()` queries will be carried out from the same snapshot.

Transactions are always run in the order of the `exec()` call received by the library. So the following situation can happen just like their SQL counterpart:

<pre>
t0 ---------- t1 ---------- t2 ---------- t3 ----------->
S0                          S1
|create tx1
              |create tx2
                            |tx2 exec and committed
                                          |tx1 exec and committed
</pre>

Although transaction `tx1` is created before `tx2`, because the calling of its `exec()` is after `tx2` been committed, `tx1` will operate on the snapshot `S1` instead of the snapshot `S0` of its creation. In short, please treat `exec()` of a transaction object as both `BEGIN TRANSACTION` and `COMMIT`.

When a transaction (either implicit or explicit) is resolved, no further queries can be made within that transaction. Trying to reuse the transaction object will result in error.  This implies any conditional behavior must either span multiple transactions or be composed out of the available primitives within a transaction.

### 3.5 Delete Database

Lovefield does not support deleting a database, unfortunately. User is required to use IndexedDB API to delete the database if required.

