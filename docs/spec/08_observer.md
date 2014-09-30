# Lovefield Specification

## 8. Observers

_This section is not finalized and subject to changes._

Lovefield offers observers to notify snapshot changes. Observers can only be created on tables with primary keys, or a query that involves only one table. For example,

```js
var p = db.getSchema().getPhoto();
var q = db.getSchema().getPin();

// Create an observer on whole table
var observer1 = db.createObserver(p);

// Create an observer on results returned from read-only query
var observer2 =
    db.createObserver(
        db.select().from(p).where(p.id.in(['1','2'])));

// Throws, Pin does not have primary key
var observer3 = db.createObserver(q);

// Throws, query context involves more than one table
var observer4 = db.createObserver(
    db.select(p.id).from(p, q).where(
        lf.op.and(q.state.eq(1), p.id.eq(q.id)));

var onChange = function(changeContext) {
  // Handle changes here, must be reentrant. Changes are called
  // asynchronously after transaction commits, and the rows are
  // read-only.
  // changeContext is an object having following properties:
  //   * changedRows: contains full row contents
  //   * deletedRows: only guarantee that primary keys are valid
};

observer1.start(onChange);  // Start observation
observer1.start(function(ctx){});  // Throws, already started.
observer2.start(onChange);

db.insert().into(p).values(...);  // triggers observer1 only
// triggers both observer1 and observer2
db.update(p).set(...).where(p.id.eq('1'));
db.delete().from(p).where(p.id.eq('3'));  // triggers observer1 only

observer1.stop();  // Stops observation

observer1.start(someNewFunction);  // Start observation again
```

An observer can be created on a table or on a read-only query. The query will be executed immediately at the time of `observer.start()`, which will create an implicit read-only transaction and database snapshot. Every update/write regarding to the affected range will trigger the `onChange` function given to the observer.
