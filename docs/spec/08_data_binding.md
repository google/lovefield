# Lovefield Specification

## 8. Data Binding

### 8.1 Observers

Lovefield supports data observation for SELECT quries, and the syntax is very
similar to ES7 Array.observe(). For example:

```js
var p = db.getSchema().table('Photo');
var query = db.select().from(p).where(p.id.eq('1'));

// Handler shares exactly same syntax as the handler for Array.observe.
var handler = function(changes) {
  // Will be called every time there is a change until db.unobserve is called.
};
db.observe(query, handler);

// The call below will trigger changes to the observed select. Internally
// Lovefield will run the query again if the scope overlaps, therefore please
// be aware of performance consequences of complex SELECT.
db.update(p).set(p.title, 'New Title').where(p.id.eq('1')).exec();

// Remember to release observer to avoid leaking.
db.unobserve(query, handler);
```

### 8.2 Parameterized Query

Parameterized query are very common for RDBMS programming, and Lovefield
supports it. For example:

```js
var p = db.getSchema().table('Photo');
var q1 = db.select().from(p).where(p.id.eq(lf.bind(0)));
q1.bind(['id1']).exec();  // find id 1
q1.bind(['id2']).exec();  // find id 2
var q2 = db.
    update(p).
    set(p.timestamp, lf.bind(1)).
    set(p.local, lf.bind(2)).
    where(p.id.eq(lf.bind(0)));
q2.bind(['id3', 345, false]).exec();  // update without reconstructing query.
q2.bind(['id4', 2222, true]).exec();
```

For performance resaons, the `bind()` function unfortunately does not provide
type checking. Users are responsible for making sure the bound values are of
their correct type.

The bind index is 0-based. The `bind()` call does not care if the array is
bigger than actually needed. The user just needs to make sure the specified
index has data of the correct type.

#### Integration with Observers

Parameterized query combined with Observers can be used to handle a common
scenario of updating data in MVC environment, for example:

```js
// populateChanges is a function that binds query results to UI display by
// observing query changes.
var populateChanges = function(changes) {};
var order = db.getSchema().table('Order');
var query = db.
    select().
    from(order).
    where(order.date.between(lf.bind(0), lf.bind(1)));
db.observe(query, populateChanges);

// Say we have two text boxes on screen, whose values are bound to an in-memory
// object named dataRange. When the dataRange changes, we want to update the
// query binding so that the query results are updated.
var handler = function(changes) {
  // Update query binding and run query. Since the query results are already
  // bound to UI, the UI will reflect the new data.
  query.bind([changes.object.dateFrom, changes.object.dateTo]).exec();
};
Object.observe(dataRange, handler);
```

#### Supported queries

Currently parameterized queries can only exist in search conditions
(i.e. `where()`) of `select()`/`update()`/`delete()`, and the `set()` clauses
for `update()` query. For example:

```js
db.select().from(order).where(order.date.eq(lf.bind(0)));
db.update(order).
    set(order.date, lf.bind(1)).
    where(order.id.eq(lf.bind(0)));
db.delete().from(order).where(order.id.eq(lf.bind(1)));
```

The `insert()` query does not support parameterized query. It makes little sense
to bind `values()` since users has to call `createRow()` before calling
`values()` anyway.
