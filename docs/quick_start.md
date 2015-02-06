# Quick Start Guide for Lovefield

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

