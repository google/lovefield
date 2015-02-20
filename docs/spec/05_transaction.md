# Lovefield Specification

## 5. Transaction

### 5.1 Execution Plan

Queries are executed by the execution engine when either
`lf.query.Builder#exec`, `lf.Transaction#exec`, or `lf.Transaction#attach` is
invoked. The queries will be converted into execution plans understandable by
the query engine. Lovefield offers `explain()` which will generate an execution
plan but will not execute it. This is very useful for debugging a slow query.

```js
var p = db.getSchema().table('Photo');
var a = db.getSchema().table('Album');
var query = db.select().
    from(p).
    innerJoin(a, p.albumId.eq(a.id)).
    where(a.id.eq('1'));
console.log(query.explain());  // DEBUG only
```

### 5.2 Implicit Transaction

Most of the time, queries are executed in implicit transactions due to the
concise syntax:

```js
ds.connect().then(function(db) {
  var item = db.getSchema().table('Item');

  // SELECT * FROM Item;
  return db.select().from(item).exec();
});
```

In this simple example, a select query is built via a query builder returned
by `db.select()`. The query builder uses various augmentation functions to
complete the query context without risk of SQL injection, and at the end the
`exec()` method is called and the query is dispatched to query engine. Query
engine will create an implicit transaction for this query, execute it, and
return the results.


### 5.3 Explicit Transactions

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

The `exec()` function of a transaction also returns a promise, just like other
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
  // Canceling everyone's vacation is not really a good idea.
  // Remember, rollback() is an asynchronous call that returns a Promise.
  return tx.rollback();
});
```

The `exec()`, `commit()`, and `rollback()` call will make the transaction be in
the termination state, which means that all member functions of the transaction
object will throw error if called after termination.

The transactions are defined by interface [`lf.Transaction`](
https://github.com/google/lovefield/blob/master/lib/transaction.js).

### 5.4 Concurrency Control

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

