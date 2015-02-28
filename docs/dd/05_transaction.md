# Lovefield Design Document

## 5. Transaction

A transaction is an atomic unit of execution that guarantees all queries inside
this transaction to be committed as a whole, or none get committed.
Function-wise, transactions are either read-only or read-write; Syntax-wise,
transactions can be implicit or explicit. The concurrency control model for
transactions is already [defined in the spec](
../spec/05_transaction.md#54-concurrency-control).


### 5.1 Transaction Creation

Implicit transactions are created when `exec()` of a query builder is called.
For example:

```js
db.select().from(job).exec();  // Implicit read-only transaction.
db.insert().into(job).values(rows).exec();  // Implicit read-write transaction.
```

Multiple implicit transactions will exhibit worse performance than a single
explicit transaction. Users are encouraged to group their write operations to
as few transactions as possible, for better performance.

All read-only transactions in Lovefield are implicit transactions created by
`SELECT` queries' `exec()` method. It will lock the scoped tables with shared
lock.

All explicit transactions are read-write transactions created by
`createTransaction()`. For example:

```js
var tx = db.createTransaction();
```

The scope of the transaction must be specified explicitly:

* Using the `exec()` method, where Lovefield can calculate the table scope
  by parsing query, OR
* Using the `begin()` method to explicitly specify the table scope.

The transaction will place reserved locks on all involving tables to prevent
other writers from polluting its snapshot.

### 5.2 Runner

The core logic of runner is to schedule and run transactions in correct order.
Each transaction has a scope. Lovefield allows multiple concurrent readers for a
given table, until a writer asks to lock the table. All transactions are
executed by `Runner`. Based on scopes, runner will arrange the execution order
of transactions, and attempt to concurrently execute as many transactions as
possible.

The transactions are wrapped in `Task` objects. Besides scope operations, Task
objects are also used to implement observing SELECT queries. When a SELECT
query is been observed, the tasks will check if that query needs to be re-run
provided that the query's scope has changes, or the query had been bound to
different set of parameters.

All observers are stored in global `ObserverRegistry`, which is a map of
queries to their observers. Observers are triggered in the following two cases:

* When the observed scope has changed.
* When a table belonging to the observed scope has been modified.

When runner finished any transaction, it will check whether the finished
transaction altered the scope of observed queries. If so, runner will schedule
those queries as immediate tasks. Also, runner will check whether the bound
values has changed from last seen (if any). If so, run the snapshot diff logic
and trigger observer accordingly. The immediate observer task will effectively
delay all pending transactions, just like `TRIGGER` in other DBMS system. Users
are responsible for embracing possible performance hit and planning ahead.

### 5.3 Journal
The atomicity of a transaction is guaranteed by `Journal`, which serves as
an in-memory snapshot of transaction execution states. When a transaction is
executed, the physical plans of queries inside it will be executed one-by-one.
For physical plans that need to change database contents, these changes are
staged inside Journal. When all the plans are executed, a diff between
post-transaction and pre-transaction states will be generated, and flushed into
data store. Since IndexedDB provides atomic writing, this writing will be
guaranteed to be all-success or all-fail, and hence the transaction is committed
or rolled back.
