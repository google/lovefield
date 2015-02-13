# Quick Start Guide for Lovefield

## <3 Minutes Quick Start

1. Download <a href="https://raw.githubusercontent.com/google/lovefield/master/dist/lovefield.min.js">Lovefield distribution</a> and serve in your server.

2. Use it in your code. You can grab the following HTML from <a href="https://raw.githubusercontent.com/google/lovefield/master/examples/todo.html">examples/todo.html.</a>

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Minimal example of using Lovefield</title>
    <script src="lovefield.min.js"></script>
  </head>
  <body>
    <script>

var ds = lf.schema.create('todo', 1);

ds.createTable('Item').
    addColumn('id', lf.Type.INTEGER).
    addColumn('description', lf.Type.STRING).
    addColumn('deadline', lf.Type.DATE_TIME).
    addColumn('done', lf.Type.BOOLEAN).
    addPrimaryKey(['id']).
    addIndex('idxDeadline', ['deadline'], false, lf.Order.DESC);

var todoDb;
var item;
ds.getInstance().then(function(db) {
  todoDb = db;
  item = db.getSchema().table('Item');
  var row = item.createRow({
    'id': 1,
    'description': 'Get a cup of coffee',
    'deadline': new Date(),
    'done': false
  });

  return db.insertOrReplace().into(item).values([row]).exec();
}).then(function() {
  return todoDb.select().from(item).where(item.done.eq(false)).exec();
}).then(function(results) {
  results.forEach(function(row) {
    console.log(row['description'], 'before', row['deadline']);
  });
});

    </script>
  </body>
</html>
```

## More Details

### Using `npm`

Besides downloading directly from GitHub repository, Lovefield supports `npm`
package management system and can be found using

```bash
npm info lovefield
```

Adding Lovefield as the dependency and `npm update` will automatically
pull down designated release.

### Defining Schema

The concept of Lovefield is to define a database *__schema__*, then operate on
the *__instance__* implementing that schema. In the example, schema definition
is carried out through a set of synchronous APIs:

```js
// SQL equivalent: CREATE DATABASE todo
var schemaBuilder = lf.schema.create('todo', 1);

// SQL equivalent:
// CREATE TABLE Item (
//   id AS INTEGER,
//   description AS INTEGER,
//   deadline as DATE_TIME,
//   done as BOOLEAN,
//   PRIMARY KEY ON ('id')
// );
// CREATE INDEX idxDeadLine ON Item.deadline DESC;
schemaBuilder.createTable('Item').
    addColumn('id', lf.Type.INTEGER).
    addColumn('description', lf.Type.STRING).
    addColumn('deadline', lf.Type.DATE_TIME).
    addColumn('done', lf.Type.BOOLEAN).
    addPrimaryKey(['id']).
    addIndex('idxDeadline', ['deadline'], false, lf.Order.DESC);
```

The code above has pseudo SQL commands to demonstrate their equivalent concept
in SQL. Once the schema is defined, Lovefield needs to be instructed to create
the corresponding instance:

```js
// Promise-based API to get the instance.
schemaBuilder.getInstance().then(function(db) {
  // ...
});
```

From this point on, the schema cannot be altered. Both the `getInstance()` and
Lovefield offered query APIs are asynchronous Promise-based APIs. This design
is to prevent Lovefield from blocking main thread since the queries can be
long running and demanding quite some CPU and I/O cycles.

Lovefield also uses Promise chaining pattern extensively:

```js
// Start of the Promise chaining
ds.getInstance().then(function(db) {
  // Asynchronous call getInstance() returned object: db
  todoDb = db;

  // Get the schema representation of table Item.
  // All schema-related APIs are synchronous.
  item = db.getSchema().table('Item');

  // Creates a row. Lovefield does not accept plain objects as row.
  // Use the createRow() API provided in table schema to create a row.
  var row = item.createRow({
    'id': 1,
    'description': 'Get a cup of coffee',
    'deadline': new Date(),
    'done': false
  });

  // INSERT OR REPLACE INTO Item VALUES row;
  // The exec() method returns a Promise.
  return db.insertOrReplace().into(item).values([row]).exec();

}).then(function() {
  // When reached here, Lovefield guarantees previous INSERT OR REPLACE
  // has been committed with its implicit transaction.

  // SELECT * FROM Item WHERE Item.done = false;
  // Return another Promise by calling this SELECT query's exec() method.
  return todoDb.select().from(item).where(item.done.eq(false)).exec();

}).then(function(results) {
  // The SELECT query's Promise will return array of rows selected.
  // If there were no rows, the array will be empty.

  results.forEach(function(row) {
    // Use column name to directly dereference the columns from a row.
    console.log(row['description'], 'before', row['deadline']);
  });
});
```
