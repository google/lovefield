# Lovefield Design Documents
## Parameterized Query

Parameterized query works very like Oracle or SQLite API. The general idea is
to put a placeholder in prepared query statement, and replace the value with
runtime values (i.e. *bind* the parameters).

There are two different scenarios in parameterized query:

* Search condition
* Update set

The search condition binding is achieved via value predicates
(`pred/value_predicate.js`). The `lf.bind` will return an `lf.Binder` object.
When value predicate is constructed with `lf.Binder` (for most operators) or
array of `lf.Binder` (in the case of `IN` or `BETWEEN`), it will keep the
binder reference internally. When `bind` method is called, it will update its
internally stored `value` to the value(s) given in `bind`. When the `eval`
method is called, the predicate will return the bound value, or throws an error
if unbound.

The update set binding is done in `query/update_builder.js`, since all the set
values are kept internally in that class.

## Observers

All observers are stored in global `ObserverRegistry`, which is a map of
queries to their observers. Observers are triggered in the following two cases:

* When the observed scope has changed.
* When the observed query has new binding values and is executed again.

When runner finished any transaction, it will check the following:

* If the query in the finished transaction is observed (for binding SELECTs),
  runner will check if the bound value has changed from last seen. If so, run
  the snapshot diff logic and trigger observer accordingly.
* If the query in the finished transaction is read-write, runner will scan if
  the scope of transaction overlaps with the scopes in observer registry. Then
  it will re-run the queries whose scope is affected.

In either case, new runner tasks (`ObserverTask`) will be created and inserted
in the front of runner task queue, which effectively delays all pending
transactions until these observers are satisfied.

## Future work

Currently binding is done by array. It is designed so to accomodate protobuf
JSPB format so that data downloaded from server can be directly bound into
query statements. Given that in mind, we plan to implement the following to
bind with JSON objects that are passed back from some servers:

```js
// lf.bind auto detects whether its parameter is a string or a number.
// If given a number, it assumes the binding is an array.
// If given a string, it assumes the binding is a JSON object.
var q = db.select().from(emp).where(id.eq(lf.bind('name')));

// No type checking here.
q.bind({'name': 'John Smith'}).exec().then(function(results) {});
```
