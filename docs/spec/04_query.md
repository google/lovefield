# Lovefield Specification

## 4. Query

All queries are executed in a transaction context, either implicit or explicit.
A query has following life cycle:

1. Creation: query builder creates the context of a query.
2. (Optional) Binding: parametrized values are bound to the query context.
3. Execution: query is executed within a transaction context.
4. Finalize: query results are committed or rolled back.

In this section, the query creation and binding will be covered.

### 4.1 SELECT Query Builder

The most used query in a Lovefield database is the select query. It is used to
retrieve data from database and return them as rows. The select query builder is
created by calling `lf.Database#select`:

```js
ds.connect().then(function(db) {
  var selectQueryBuilder = db.select();
});
```

The select query builder accepts sources, search conditions, limiters, sorters,
and group conditions to construct the query. Its member function signatures are
defined in [`lf.query.Select`](
https://github.com/google/lovefield/blob/0146b8c1a951ecc2cf282075e6653d63aac1aed9/lib/query.js#L66-L150).
All functions provided by select query, except `orderBy()`, can only be called
once, otherwise an exception will be raised. For example,

```js
db.select().
    from(infoCard).
    from(infoCardDetails).  // exception will be thrown here
    orderBy(infoCard.lang, lf.Order.ASC).
    orderBy(infoCard.itag)  // ok, sort itag after sorting lang
```

One important concept is to treat the returned results of select queries as
read-only and do not modify it. Based on performance considerations, Lovefield
does not actively clone/freeze the object retrieved from its internal cache.
For this to work, the user is supposed to follow the rule of not altering
results returned from select query. For example:

```js
db.select().from(orders).exec().then(function(rows) {
  myCell.text = rows[0].amount.toString();  // OK, use it read-only.
  rows[0].amount = 22;  // BAD IDEA, causing cache out of sync with DB.
});
```

#### 4.1.1 Filters

Filters are provided in the form of parameters of `select`. Absence of
parameters implies select all columns (i.e. `SELECT *`). In multi-table context,
the returning rows will prefix table name for each column. The parameters must
be schema column object, for example:

```js
var infoCard = db.getSchema().table('InfoCard');
var q1 = db.
    select(infoCard.id, infoCard.lang, infoCard.fileName).
    from(infoCard);
q1.exec().then(function(rows) {
  // No prefix, context involves only one table
  // console.log(rows[0]['id'], rows[0]['lang'], rows[0]['fileName']);
});

var asset = db.getSchema().table('Asset');
var q2 = db.select().
    from(infoCard).
    innerJoin(asset, asset.id.eq(infoCard.id)).
    where(asset.id.eq('1'));
q2.exec().then(function(rows) {
  // No prefix, context involves only one table
  console.log(rows[0]['id'], rows[0]['lang'], rows[0]['fileName']);
});
var q3 = db.select(infoCard.id, infoCard.itag, asset.timestamp).
    from(infoCard).
    innerJoin(asset, asset.id.eq(infoCard.id)).
    where(asset.id.eq('1'));
q3.exec().then(function(rows) {
  // Prefixed columns, context involves two tables
  console.log(
      rows[0]['InfoCard']['id'],
      rows[0]['InfoCard']['tag'],
      rows[0]['Asset']['timestamp']);
});
```

#### 4.1.2 Sources and Joins

Sources are provided by the `from()` function of select query. The `from()`
function can take one or more parameters, each must be a table schema. If
multiple tables are specified, they are implicitly inner joined. Lovefield
supports only inner join and left outer join, which can also be done using
`innerJoin()` and `leftOuterJoin()` explicitly. For example:

<table>
  <tr>
    <td>
      <pre>
-- Explicit inner join
SELECT * FROM photo
  INNER JOIN album
    ON photo.albumId = album.id
  WHERE album.id = '1'
      </pre>
    </td>
    <td>
      <pre>
var p = db.getSchema().table('Photo');
var a = db.getSchema().table('Album');
db.select().
    from(p).
    innerJoin(a, p.albumId.eq(a.id)).
    where(a.id.eq('1')).
    exec();
      </pre>
    </td>
  </tr>
  <tr>
    <td>
      <pre>
-- Implicit inner join
SELECT * FROM photo p, album a
  WHERE p.albumId = a.id
    AND a.id = '1'
      </pre>
    </td>
    <td>
      <pre>
var p = db.getSchema().table('Photo');
var a = db.getSchema().table('Album');
db.select().
    from(p, a).
    where(lf.op.and(
        p.albumId.eq(a.id),
        a.id.eq('1'))).
    exec();
      </pre>
    </td>
  </tr>
  <tr>
    <td>
      <pre>
-- Implicit inner self join
SELECT * FROM job j1, job j2
  WHERE j1.minSalary = j2.maxSalary
      </pre>
    </td>
    <td>
      <pre>
var j1 = db.getSchema().table('Job').as('j1');
var j2 = db.getSchema().table('Job').as('j2');
db.select().
    from(j1, j2).
    where(j1.minSalary.eq(j2.maxSalary)).
    exec();
      </pre>
    </td>
  </tr>
  <tr>
    <td>
      <pre>
-- Left outer join
SELECT p.id, a.id, a.name
  FROM photo p
  LEFT OUTER JOIN album a
    ON p.albumId = a.id
      </pre>
    </td>
    <td>
      <pre>
var p = db.getSchema().table('Photo');
var a = db.getSchema().table('Album');
db.select(p.id, a.id, a.name).
    from(p).
    leftOuterJoin(a, p.albumId.eq(a.id)).
    exec();
      </pre>
    </td>
  </tr>
</table>

#### 4.1.3 Search Conditions

Search conditions is the condition combinations used inside `where()`. In SQL,
it’s actually a boolean value expression, whose grammar can be found
[here](http://savage.net.au/SQL/sql-2003-2.bnf.html#boolean%20value%20expression
). Lovefield provides following building blocks to help users construct their
search conditions.

Search conditions are orchestrated by predicates. Lovefield uses various
predicates to provide a subset of [nonparenthesized value expression primary](
http://savage.net.au/SQL/sql-2003-2.bnf.html#nonparenthesized%20value%20expression%20primary)
in SQL grammar. These predicates are generated from predicate providers:

|Function   |Number of parameters |SQL equivalent |
|:--------- |:------------------- |:------------- |
|`eq`       |1 (scalar or column) |`=`            |
|`neq`      |1 (scalar or column) |`<>`           |
|`lt`       |1 (scalar or column) |`<`            |
|`lte`      |1 (scalar or column) |`<=`           |
|`gt`       |1 (scalar or column) |`>`            |
|`gte`      |1 (scalar or column) |`>=`           |
|`match`    |1 (regex)            |`SIMILAR`      |
|`between`  |2 (scalars only)     |`BETWEEN`      |
|`in`       |1 (array of scalars) |`IN`           |
|`isNull`   |0                    |`IS NULL`      |
|`isNotNull`|0                    |`IS NOT NULL`  |

The behavior of eq(null) is the same as isNull(). Similarly neq(null) is the
same as isNotNull(). This behavior is designed to make parameter binding easier
so that the users do not need two different queries to handle cases for NULL.

All these operators are defined in the interface of [`lf.PredicateProvider`](
https://github.com/google/lovefield/blob/0146b8c1a951ecc2cf282075e6653d63aac1aed9/lib/predicate.js#L54-L153).
The general idea is that the column acquired from schema object also
implements the predicate provider interface:

```js
// This is an lf.schema.Table object
var infoCard = db.getSchema().table('InfoCard');

// infoCard.id implements both lf.schema.Column and lf.PredicateProvider,
// therefore it can used to create a predicate.
var pred = infoCard.id.eq('1234');
```

Since the predicate provider is implemented by the returned column schema,
it naturally implies that the left-hand-side operand is the value of that
column. The match function will take a JavaScript regular expression instead of
SQL SIMILAR’s regular expression.

Many times the predicates need to be combined to implement complex search
conditions. Lovefield provides following functions for combining predicates:

|Function    |Number of parameters|SQL equivalent |
|:---------- |--------------------|:------------- |
|`lf.op.and` |variable            |`AND`          |
|`lf.op.or`  |variable            |`OR`           |
|`lf.op.not` |1                   |`NOT`          |

Their actual function signatures is defined in [`lf.op`](
https://github.com/google/lovefield/blob/master/lib/op.js).


#### 4.1.4 Limiters and Order

Lovefield does not support cursor, therefore the paging of rows can only be
done using `limit()` and `skip()` functions offered by select query builder:

```js
db.select().
    from(infoCard).
    limit(100).
    skip(100).
    orderBy(infoCard.lang, lf.Order.DESC).
    exec();
```

Same as SQL’s `LIMIT` and `SKIP`, if the select queries are not grouped within
the same transaction, there will be no guarantee that these rows won’t overlap
or skip if any insertion/deletion happens in between the select.

The `orderBy()` by default uses ascending order. The implementation needs to
build an iterator that can be traversed in reverse direction as fast as the
designated direction.

#### 4.1.5 Group By and Aggregators

Lovefield provides following aggregation functions to be used with group-by:

|Function        |SQL equivalent |Valid Types for Parameter                |
|:-------------- |:------------- |:--------------------------------------- |
|`lf.fn.avg`     |`AVG`          |`number`, `integer`                      |
|`lf.fn.count`   |`COUNT`        |Any type                                 |
|`lf.fn.distinct`|`DISTINCT`     |Any type                                 |
|`lf.fn.geomean` |none           |`number`, `integer`                      |
|`lf.fn.max`     |`MAX`          |`number`, `integer`, `string`, `datetime`|
|`lf.fn.min`     |`MIN`          |`number`, `integer`, `string`, `datetime`|
|`lf.fn.stddev`  |`STDDEV`       |`number`, `integer`                      |
|`lf.fn.sum`     |`SUM`          |`number`, `integer`                      |

These functions are defined in the [`lf.fn`](
https://github.com/google/lovefield/blob/master/lib/fn.js) namespace. A
`SyntaxError` will be thrown if an aggregation function is used with a column of
an invalid type. Multi-column `ROLLUP`, and `CUBE` are not supported for now.

```js
db.select(customer.name, lf.fn.count(order.id)).
    from(order, customer).
    where(order.customerId.eq(customer.id)).
    groupBy(customer.name).exec();
```

Just like SQL, the search conditions in `where()` does not support aggregators.
Lovefield does not support `HAVING`. The users can do two queries or simply
filter out the selected results.

The results of aggregated functions are named after the function itself. For
example:

```js
db.select(lf.fn.count(order.id)).from(order).exec.then(function(results) {
  // Results contains only one row with one column, 'COUNT(id)'
  console.log(results[0]['COUNT(id)']);
});

db.select(customer.name, lf.fn.count(order.id)).
    from(order, customer).
    where(order.customerId.eq(customer.id)).
    groupBy(customer.name).exec(function(results) {
      // Results are grouped in nested objects, see 4.1.8
      var row0 = results[0];
      console.log(row0['Customer']['name'], row0['Order']['COUNT(id)']);
    });
```

#### 4.1.6 Column aliases

Each selected column can have alias for their representations in returned
results. All aliased columns are flattened (i.e. no prefix). For example:

```js
var infoCard = db.getSchema.table('InfoCard');
var q1 = db.select(
    infoCard.id,  // No alias
    infoCard.lang.as('Language'),  // Aliased
    infoCard.fileName.as('File Name'));
q1.exec().then(function(rows) {
  // No prefix, context involves only one table
  // console.log(rows[0]['id'], rows[0]['Language'], rows[0]['File Name']);
});

var asset = db.getSchema.table('Asset');
var q3 = db.select(
    infoCard.id.as('InfoCard Id'),
    infoCard.itag,
    asset.timestamp.as('Timestamp')).
    from(infoCard).
    innerJoin(asset, asset.id.eq(infoCard.id)).
    where(asset.id.eq('1'));
q3.exec().then(function(rows) {
  // Prefixed columns, context involves two tables
  console.log(
      rows[0]['InfoCard Id'],  // Alias column is flattened.
      rows[0]['InfoCard']['tag'],  // Non-aliased columns are still prefixed
      rows[0]['Timestamp']);
});
```

The prefix and non-prefixed retrieval are described in
[4.1.8](04_query.md#418-retrieval-of-query-results).

#### 4.1.7 Table Aliases

Each table can have an alias that will affect the format of the returned
results. Table aliases have no effect if only one table is involved in a query.
Table aliases are required for executing a self table join.

```js
// Finds all job pairs where the min salary of the first job is equal to the
// max salary of the second. This query is not possible without using a table
// alias.
var j1 = db.getSchema().table('Job').as('j1');
var j2 = db.getSchema().table('Job').as('j2');
var q = db.select(j1.title, j2.title, j1.minSalary).
    from(j1, j2).
    where(j1.minSalary.eq(j2.maxSalary));

q1.exec().then(function(rows) {
  rows.forEach(function(row) {
    // Self-join results are also nested objects, see 4.1.8.
    console.log(
        row['j1']['title'],
        row['j2']['title'],
        row['j1']['minSalary']);
  };
});
```

#### 4.1.8 Retrieval of Query Results

Unlike other SQL engines, Lovefield does not flatten query results for
inner-join queries. The inner joined results are returned as nested objects
(a.k.a. prefixed), for example:

```js
var p = db.getSchema().table('Photo');
var a = db.getSchema().table('Album');
db.select().
    from(p, a).
    where(lf.op.and(
        p.albumId.eq(a.id),
        a.id.eq('1'))).
    exec(function(results) {  // results is an array.
      // Each elements in the array is a nested object.
      var row0 = results[0];
      console.log(row0['Photo']['id'], row0['Album']['id']);
    });
```

The results can be flattened by using the `as()` function for each columns in
`select()`:

```js
var q3 = db.select(
    infoCard.id.as('InfoCard Id'),
    asset.timestamp.as('Timestamp')).
    from(infoCard).
    innerJoin(asset, asset.id.eq(infoCard.id)).
    where(asset.id.eq('1'));
q3.exec().then(function(rows) {
  // Aliased columns are flattened.
  console.log(rows[0]['InfoCard Id'], rows[0]['Timestamp']);
});
```

The reason that flattening is not performed by default is the performance
penalty imposed. The flattening for `as()` is done internally by Lovefield using
function similar to the following:


```js
function(objectsToMerge) {
  var mergedObj = {};
  objectsToMerge.forEach(function(obj) {
    Object.keys(obj).forEach(function(key) {
      mergedObj[key] = obj[key];
    });
  });
  return mergedObj;
}
```

The above function needs to be executed once for every row in the result.
Flattening N objects to a single object causes significan slow down if N is big.
As a result, Lovefield does not perform the flattening by default.


### 4.2 INSERT Query Builder

There are two different insert builders: `lf.Database#insert` and
`lf.Database#insertOrReplace`. The former allows insertion of new rows only
(determined based on primary key), while the latter will overwrite any existing
row.

Both builders implement the interface [`lf.query.Insert`](
https://github.com/google/lovefield/blob/0146b8c1a951ecc2cf282075e6653d63aac1aed9/lib/query.js#L154-L173).

#### 4.2.1 Prepare Rows for Insertion

Users must use `lf.schema.Table#createRow` to create a row. For example:

```js
var infoCard = db.getSchema().table('InfoCard');
var row = infoCard.createRow({
  'id': 'something',
  'lang': 140
});
```

All insert queries assume multiple rows will be inserted at the same time,
therefore the user must wrap their row in an array even if there is only one.
All the inserted/replaced rows are returned in the success callback, as shown
below.

```js
db.insertOrReplace().into(infoCard).values([row]).exec().then(
  function(rows) {
    console.log(rows[0]['id']); // 'something'
    // The payloads of the rows that were inserted/replaced are returned here.
    // This is especially useful when an auto-increment primary key is being
    // used, because it reveals the automatically assigned primary keys.
  });
```

All functions provided by insert query builder can only be called once,
otherwise an exception will be raised.

### 4.3 UPDATE Query Builder

Update query builders are acquired from `lf.DataBase#update`, and the user must
pass in the target table as its parameter, as documented in the
[`lf.query.Update`](
https://github.com/google/lovefield/blob/0146b8c1a951ecc2cf282075e6653d63aac1aed9/lib/query.js#L177-L198) interface.
The updated values are provided by the `set()` clause, as shown below:

```js
// UPDATE order SET amount = 51, currency = 'EUR'
//   WHERE currency = 'DEM' AND amount = 100;
db.update(order).
    set(order.amount, 51).
    set(order.currency, 'EUR').
    where(lf.op.and(
        order.currency.eq('DEM'), order.amount.eq(100))).
    exec();  // Returns a Promise.
```

The `where()` function is shared with select query since they are both search
conditions. All functions provided by update query builder, except the `set()`
function, can only be called once.

### 4.4 DELETE Query Builder

The delete query builder is provided by `lf.Database#delete` and can be used
to delete one or more rows with or without search conditions. It implements
[`lf.query.Delete`](
https://github.com/google/lovefield/blob/0146b8c1a951ecc2cf282075e6653d63aac1aed9/lib/query.js#L202-L221)
interface.

```js
// DELETE FROM infoCard WHERE lang = 'es';
db.delete().from(infoCard).where(infoCard.lang.eq('es')).exec();
db.delete().from(infoCard).exec();  // Delete everything in infoCard
```

All functions provided by delete query builder can only be called once,
otherwise an exception will be raised.

### 4.5 Parameterized Query

Parameterized query are very common for RDBMS programming, and Lovefield
supports it. For example:

```js
var p = db.getSchema().table('Photo');

// SELECT FROM Photo WHERE id = ?0;
var q1 = db.select().from(p).where(p.id.eq(lf.bind(0)));
q1.bind(['id1']).exec();  // find id 1
q1.bind(['id2']).exec();  // find id 2

// INSERT query is slightly tricky when using bind.
// You can bind an array directly.
var q8 = db.insert().into(p).values(lf.bind(0));
q8.bind([[p.createRow(payload7), p.createRow(payload8)]]).exec();
// Or bind individual values.
var q9 = db.insertOrReplace().into(p).values([lf.bind(0), lf.bind(1)]);
q9.bind([p.createRow(payload9), p.createRow(payload10)]).exec();
// Either way you need to createRow() as the bound value.

// UPDATE Photo SET timestamp = ?1, local = ?2 WHERE id = ?0;
var q2 = db.
    update(p).
    set(p.timestamp, lf.bind(1)).
    set(p.local, lf.bind(2)).
    where(p.id.eq(lf.bind(0)));
q2.bind(['id3', 345, false]).exec();  // update without reconstructing query.
q2.bind(['id4', 2222, true]).exec();
```

LIMIT and SKIP can also be parametrized. For example

```js
// SELECT FROM Employee ORDER BY lastName LIMIT ?0 SKIP ?1;
var e = db.getSchema().table('Employee');
var q3 = db.select().
    from(e).
    orderBy(e.lastName).
    limit(lf.bind(0)).
    skip(lf.bind(1));
q3.bind([100, 0]).exec();  // get the 1st page of 100 employees.
q3.bind([100, 1]).exec();  // get the 2nd page of 100 employees.
```

The function [`lf.bind()`](
https://github.com/google/lovefield/blob/e1f59b8212bbfc4867453b2623ccd55edb879311/lib/bind.js#L21-L28)
creates a placeholder in query context. When `lf.query.Builder#bind` is called,
the placeholder will be replaced with the value provided in the binding array.
For performance reasons, the `bind()` function unfortunately does not provide
type checking. Users are responsible for ensuring that the bound values are of
their correct type.

The bind index is 0-based. The `bind()` call does not care if the array is
bigger than actually needed.

The following tables shows the clauses that are parametrizable for each query
type.

|Query type   |Parametrizable clauses         |
|:----------- |:----------------------------- |
|`SELECT`     |`where()`, `limit()`, `skip()` |
|`INSERT`     |`values()`                     |
|`UPDATE`     |`where()`, `set()`             |
|`DELETE`     |`where()`                      |

The following example shows how to parametrize an `update()` and a `delete()`
query.

```js
db.update(order).
    set(order.date, lf.bind(1)).
    where(order.id.eq(lf.bind(0)));
db.delete().from(order).where(order.id.eq(lf.bind(0)));
```

### 4.6 Observers

Lovefield supports data observation for select queries, and the syntax is very
similar to ES7 Array.observe(). The observers are created using
`lf.Database#observe`, For example:

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

Combining parametrized query with Observers can be used to handle a common
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
