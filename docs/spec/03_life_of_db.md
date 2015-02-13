# Lovefield Specification

## 3. Life of a Lovefield Database

Lovefield database is scoped per-origin, like IndexedDB, and (origin, DB name,
DB version) uniquely identify a database instance. The database is stored in a
[Data Store](02_data_store.md).

### 3.1 Lovefield Initialization

The `getInstance()` method will implicitly invoke Lovefield initialization,
which will load the DB instance from data store if existed. If Lovefield
detected schema version mismatch, it will do the following:

* If persisted schema version is newer than requested, throw an exception.
* If persisted schema version is older than requested, perform database upgrade.

`getInstance()` shall be called only once for each DB. In rare circumstances,
one can call `close()` on the opened instance first, then call `getInstance()`
again. However, this is not guaranteed to work due to IndexedDB limitations,
see [Data Store](02_data_store.md) for details.

Users are free to use two or more database instances simultaneously at the same
program in the same session.

#### 3.1.1 Volatile Storage

In certain use cases, persistent storage is not required or even a bad idea.
For example, persisting test data onto persistent storage in unit tests is
typically undesirable. It slows down the test, and requires test infrastructure
support for removing persisted data. In Lovefield, one can use a pure in-memory
storage to make sure all data are volatile by calling

```js
ds.getInstance(onUpgrade, /* opt_volatile */ true)
```

to force all data are stored and retrieve data from memory cache only. The
`onUpgrade` must be `undefined` in this case since upgrading volatile data store
is not applicable.

### 3.2 Multi-Process Connection

Lovefield assumes that at a given time, there is only one Lovefield instance
writing its corresponding database. By design the tuple (origin, schema name,
version) uniquely identify a database. If there are multiple pages or tabs
accessing the same database, there can be a problem of data inconsistency.
Users shall be aware of this problem and plan accordingly.

In Lovefield's current status, the query engine may have inconsistent in-memory
snapshot if there are more than one connections making write request to the
backing store. There are several proposals for solving this issue and they are
under evaluations.

Current best practice is to use a dedicated background component (in the form
of background page, WebWorker, or ServiceWorker) to handle all Lovefield
operations, and the other tabs/windows postMessage to that component to perform
DB operations.

If different processes attempted to open the same database with different
versions, the behavior is currently undefined and Lovefield team will work
on this issue once the multi-process access model settles.

### 3.3 Database Upgrade

Lovefield will open the database using the version specified in schema
(see [Schema Definition](01_schema.md)). When the version mismatch, the database
upgrade mechanism will be triggered.

The first step of database upgrade is to create new tables. Lovefield checks the
tables that are not in database but in the schema, and creates them accordingly.
After this is done, Lovefield will call the user-provided upgrade function.

User needs to provide the custom upgrade function as a parameter of
`getInstance()` if the upgrade involves deleting or transforming table. The
function will be given a raw database instance that is capable of doing table
schema alternation. The function must return a promise. After the promise is
resolved, a new database instance will be created and returned. If the promise
is rejected, the `getInstance()` call will also be rejected.

Users do not need to worry about new indices or altering indices for version
upgrades. Query engine will detect index schema change and recreate all the
indices when needed.  Query engine will drop all persisted indices and recreate
them in the scenario of database upgrade to ensure data consistency.

For the case of deleting table, user is responsible to perform the deletion in
upgrade function. Lovefield does not provide auto-drop due to data safety
concerns. IndexedDB does not provide a way of renaming table, therefore renaming
a table will require recreating a table with exact contents and deleting the old
table, which cannot be done safely within the upgrade transaction and user is
supposed to do it manually outside of the `onUpgrade` function.

For the case of altering table, if the transformation is renaming column, adding
a nullable/fixed value column, or deleting a column, user can use helper
functions provided, otherwise user needs to do row-by-row transformation. For
renaming, user is responsible for making sure the renamed column has exactly the
same schema as old table, and the renamed column has exactly the same type as it
was. For transformation case, user is responsible for making sure the
transformed rows will fit in new schema and does not violate constraints.
Failing to do so may cause exceptions to be thrown during query execution.
Lovefield disallows altering column types directly.

The following is a sample code snippet demonstrating database upgrades.

```js
// Open database, perform database creation or upgrade if necessary.
ds.getInstance(onUpgrade).then(
  // All new/upgrade related stuff has been completed.
  /** @param {lf.Database} db */
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

  // DROP TABLE Progress.
  // This call is synchronous.
  rawDb.dropTable('Progress');

  // Add column agent (type string) to Purchase with default value 'Smith'.
  var p1 = rawDb.addTableColumn('Purchase', 'agent', 'Smith');

  // Delete column metadata from Photo.
  var p2 = rawDb.dropTableColumn('Photo', 'metadata');

  // Rename Photo.isLocal to Photo.local.
  var p3 = rawDb.renameTableColumn('Photo', 'isLocal', 'local');

  // Transformations are not supported because of IndexedDB auto-commit: Firefox
  // immediately commits the transaction when Lovefield tries to return a
  // promise from scanning existing object stores. Users are supposed to do a
  // dump and make the transformation outside of onUpgrade routine.

  // DUMP the whole DB into a JS object.
  var p4 = rawDb.dump();

  return Promise.all([p1, p2, p3, p4]);
}
```

Users shall not assume that Lovefield will upgrade all data in-place. In certain
circumstances, Lovefield may require to recreate a completely new database and
copy the data over (which will be the last resort, for example, implementing a
new and more efficient storage format). Since the database upgrade can be
time-consuming, user is responsible for defining their own progress event and
fire within the callback function.

The interface [`lf.raw.BackStore`](
https://github.com/google/lovefield/blob/master/lib/raw.js) contains detailed
documentation for each of its member function.

### 3.4 Database Instance

If the schema version matches, or the database upgrade procedure completed, the
resolve function of the returning promise will receive a database instance
object implementing [`lf.Database`](
https://github.com/google/lovefield/blob/master/lib/database.js) interface. The
database object can be used to

* Retrieve corresponding schema (`getSchema()`)
* Create query builders (`select()`, `insert()`, `insertOrReplace()`,
  `update()`, and `delete()`)
* Create transactions (`createTransaction()`)
* Manage observers (`observe()` and `unobserve()`)
* Close database (`close()`)

#### 3.4.1 Database Schema

Although the schema can be retrieved from schema builder, the suggested way of
retrieving the database schema is to get them from the database instance's
`getSchema()` call, which will return an [`lf.schema.Database`](
https://github.com/google/lovefield/blob/master/lib/schema/schema.js#L57) object
that represents the schema of that instance.

The schema is used to support query building, such as providing filters and
building blocks for search conditions. The schema is hierarchical, and the
following table list the components of it:

|Class               |Meaning                                                  |
|:-------------------|:--------------------------------------------------------|
|`lf.schema.Database`|Representation of the whole database, container of table.|
|`lf.schema.Table`   |Representation of a table, container of column.          |
|`lf.schema.Column`  |Representation of table column, used by query builders.  |

#### 3.4.2 Query Builders and Transactions

All query builders implement the interface [`lf.query.Builder`](
https://github.com/google/lovefield/blob/master/lib/query.js#L28).
Their main responsibility is to generate query objects that will be accepted and
executed by query execution engine. A query object can be reused multiple times
if same query is desired.

All queries are executed in the context of transactions. Transactions can be
either implicit or explicit. Explicit transactions are created by the
`createTransaction()` call, which is equivalent to `BEGIN TRANSACTION` in SQL.
Implicit transactions are created by the query engine when the `exec()` method
of a query builder is called, and that query builder had not attached to any
explicit transaction.

Query execution and transactions will be detailed in [Life of a Query](
#35-life-of-a-query).

#### 3.4.3 Observers

Observers are used for [Data Binding](08_data_binding.md), which is documented
in its own section.

#### 3.4.4 Closing Database

Calling `close()` of a database instance will reset the database instance object
to its initial state (unopened) and is *__not__* mandatory nor recommended. Due
to IndexedDB limitations, there is no guarantee that `close()` and
`getInstance()` again will yield only one database instance in memory.

### 3.5 Life of a Query

All queries are executed in a transaction context, either implicit or explicit.
A query has following life cycle:

1. Creation: query builder creates the context of a query.
2. (Optional) Binding: parameterized values are bound to the query context.
3. Execution: query is executed within a transaction context.
4. Finalize: query results are committed or rolled back.

#### 3.5.1 Implicit Transactions

Most of the time, queries are executed in implicit transactions due to the
concise syntax:

```js
ds.getInstance().then(function(db) {
  var item = db.getSchema().table('Item');

  // SELECT * FROM Item;
  var query = db.select().from(item);
  return query.exec();
});
```

In this simple example, a select query is built via a query builder returned
by `db.select()`. The query builder uses various augmentation functions to
complete the query context without risk of SQL injection, and at the end the
`exec()` method is called and the query is dispatched to query engine. Query
engine will create an implicit transaction for this query, execute it, and
return the results.

#### 3.5.2 Explicit Transactions

Explicit transactions in Lovefield are read-write transactions. They are
designed to atomically execute multiple queries. The simple usage of an explicit
transaction is demonstrated in the following:

```js
// Get a transaction object first.
var tx1 = db.createTransaction();

// exec in order: query 1 first then query2, guaranteed snapshot
tx1.exec([query1, query2]);

// exec in order: query 3 first then query4
query3.exec().then(function() {
  query4.exec();
});

// exec in parallel (syntactically): tx1, query3, query5, query6
query5.exec();
query6.exec();

var tx2 = db.createTransaction();
tx2.exec([query7, query8]);
```

The `exec()` function of transaction also returns a promise, just like other
queries. The difference is that the transaction guarantees all queries flush
to persistent store atomically. If a transaction is created for `select()`
queries, the `select()` queries will be carried out from the same snapshot.

Transactions are always run in the order of the `exec()` call received by the
library. So the following situation can happen just like their SQL counterpart:

<pre>
t0 ---------- t1 ---------- t2 ---------- t3 ----------->
S0                          S1
|create tx1
              |create tx2
                            |tx2 exec and committed
                                          |tx1 exec and committed
</pre>

Although transaction `tx1` is created before `tx2`, because the calling of its
`exec()` is after `tx2` been committed, `tx1` will operate on the snapshot `S1`
instead of the snapshot `S0` of its creation. In short, please treat `exec()` of
a transaction object as both `BEGIN TRANSACTION` and `COMMIT`.

When a transaction (either implicit or explicit) is resolved, no further queries
can be made within that transaction. Trying to reuse the transaction object will
result in error.  This implies any conditional behavior must either span
multiple transactions or be composed out of the available primitives within a
transaction.

In many cases, queries in the same transaction must be executed in sequence,
and the following queries are referencing the results from previous queries.
In Lovefield, this is done through transaction attachment, as demonstrated
below:

```js
var schema = db.getSchema();
var e = schema.table('Employee');
var v = schema.table('Vacations');

// Get a transaction object as usual.
var tx = db.createTransaction();

// Secure the scope of queries so that there will be no surprise.
// All tables will be exclusively locked. See Concurrency Control section.
tx.begin([e, v]).then(function() {
  var q1 = db.select(e.id).from(e).where(e.hireDate.gt(someDate));

  // Attach will actually run the query in memory and get back the results.
  return tx.attach(q1);
}).then(function(results) {
  var ids = results.map(function(row) {
    return row['id'];
  });

  var q2 = db.update(v).set(v.days, 15).where(v.empId.in(ids));
  return tx.attach(q2);
}).then(function() {
  // Commit the transaction, which writes everything into database.
  // Remember, commit() is an asynchronous call that returns a Promise.
  return tx.commit();
}).then(function() {
  // ...
});

var tx2 = db.createTransaction();
tx2.begin([e]).then(function() {
  return tx.attach(
      db.update(e).set(e.location, 'MTV').where(e.id.lt(1000)));
}).then(function() {
  // exec() can be used to commit the transaction, too.
  return tx.exec(
      [db.update(e).set(e.location, 'LAX').where(e.id.gte(1000))]);
});

var tx3 = db.createTransaction();
tx3.begin([v]).then(function() {
  return tx.attach(db.update(v).set(v.days, 0);
}).then(function() {
  // Cancelling everyone's vacation is not really a good idea.
  // Remember, rollback() is an asynchronous call that returns a Promise.
  return tx.rollback();
});
```

The `exec()`, `commit()`, and `rollback()` call will make the transaction be in
the termination state, which means that all member functions of the transaction
object will throw error if called after termination.

The transactions are defined by interface [`lf.Transaction`](
https://github.com/google/lovefield/blob/master/lib/transaction.js).

#### 3.5.3 Concurrency Control

Lovefield offers table-level locking. There are three types of locks:

* Shared: a reader lock that can be granted to multiple readers.
* Reserved: a try-writer lock. This prevents granting new Shared or Reserved
  lock for the target table, but the target table is not modified yet.
* Exclusive: a writer lock. This prevents granting any new lock against
  the target table since the table is going to be modified. The table
  can only be modified when an Exclusive lock is acquired.

These locks are created in the scenarios listed below:

| Functions causing lock creation        | Lock created |
|:---------------------------------------|--------------|
|`exec()` of a `select()` query          |Shared        |
|`exec()` of an `insert()` query         |Reserved      |
|`exec()` of an `insertOrReplace()` query|Reserved      |
|`exec()` of an `update()` query         |Reserved      |
|`exec()` of an `delete()` query         |Reserved      |
|`begin()` or `exec()` of a transaction  |Reserved      |

All reserved locks will be promoted to Exclusive locks automatically by
the query runner. The exclusive locks promoted from locks created by `exec()`
method will be automatically released once Lovefield has completed necessary
data writing. Locks created by transaction's `begin()` method will not be
promoted nor released until `rollback()` or `commit()` are called on that
transaction. This implies the possibility of deadlock when multiple closures are
attempting to write the database via transactions. The users are responsible for
preventing and detecting these user code generated deadlocks.

### 3.6 Delete Database

Lovefield does not support deleting a database, unfortunately. User is required
to use IndexedDB API to delete the database if required.
