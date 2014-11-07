# Lovefield Specification

## 8. Data Binding

### 8.1 Observers

Lovefield supports data observation for SELECT quries, and the syntax is very
similar to ES7 Array.observe(). For example:

```js
var p = db.getSchema().getPhoto();
var query = db.select().from(p).where(p.id.eq('1'));

// Handler shares exactly same syntax as the handler for Array.observe.
lf.query.observe(query, handler);

query.exec().then(function(rows) {
  // The rows will be the same instance every time you call exec until
  // lf.query.unobserve is called.
});

// The call below will trigger changes to the observed select. Internally
// Lovefield will run the query again if the scope overlaps, therefore please
// be aware of performance consequences of complex SELECT.
db.update(p).set(p.title, 'New Title').where(p.id.eq('1')).exec();

// Remember to release observer to avoid leaking.
lf.query.unobserve(query, handler);
```

### 8.2 Parameterized Query

Parameterized query are very common for RDBMS programming, and Lovefield
supports it. For example:

```js
var p = db.getSchema().getPhoto();
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

It can also be combined with Observers to achieve common scenario of updating
data in MVC environment, for example:

```js
// populateChanges is a function that binds query results to UI display by
// observing query changes.
var populateChanges = function(changes) {};
var order = db.getSchema().getOrder();
var query = db.
    select().
    from(order).
    where(order.date.between(lf.bind(0), lf.bind(1)));
lf.query.observe(query, populateChanges);

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
