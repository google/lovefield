# Lovefield Specification

## 4. Select Query

The most used query in a Lovefield database will be the select query. It is
used to retrieve data from database and return them as rows. The select query
is created by calling `select()`:

```js
lava.cr.db.getInstance().then(function(db) {
  var selectQuery = db.select();
});
```

The select query then will accept sources, search conditions, limiters,
sorters, and group conditions to construct a query. All functions provided by
select query, except `orderBy()`, can only be called once, otherwise an
exception will be raised. For example,

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

### 4.1 Filters

Filters are provided in the form of parameters of `select`. Absence of
parameters implies select every column. In multi-table context, the returning
rows will prefix table name for each column. The parameters must be schema
column object, for example:

```js
var infoCard = db.getSchema.getInfoCard();
var q1 = db.select(infoCard.id, infoCard.lang, infoCard.fileName);
q1.exec().then(function(rows) {
  // No prefix, context involves only one table
  // console.log(rows[0]['id'], rows[0]['lang'], rows[0]['fileName']);
});
var asset = db.getSchema.getAsset();
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

### 4.2 Sources and Joins

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
var p = db.getSchema().getPhoto();
var a = db.getSchema().getAlbum();
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
var p = db.getSchema().getPhoto();
var a = db.getSchema().getAlbum();
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
var j1 = db.getSchema().getJob().as('j1');
var j2 = db.getSchema().getJob().as('j2');
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
var p = db.getSchema().getPhoto();
var a = db.getSchema().getAlbum();
db.select(p.id, a.id, a.name).
    from(p).
    leftOuterJoin(a, p.albumId.eq(a.id)).
    exec();
      </pre>
    </td>
  </tr>
</table>

### 4.3 Search Conditions

Search conditions is the condition combinations used inside `where()`. In SQL,
it’s actually a boolean value expression, whose grammar can be found
[here](http://savage.net.au/SQL/sql-2003-2.bnf.html#boolean%20value%20expression
). Lovefield provides following building blocks to help users construct their
search conditions.

#### 4.3.1 Global Boolean Expression Operators

Lovefield provides following functions:

|Function    |Number of parameters|SQL equivalent |
|:---------- |--------------------|:------------- |
|`lf.op.and` |variable            |`AND`          |
|`lf.op.or`  |variable            |`OR`           |
|`lf.op.not` |1                   |`NOT`          |

#### 4.3.2 Auto-Generated Predicates

Lovefield autogenerates operators providing a subset of [nonparenthesized value
expression
primary](http://savage.net.au/SQL/sql-2003-2.bnf.html#nonparenthesized%20value%2
0expression%20primary) in SQL grammar. These operators include

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

All these operators are generated as a member function of a schema column,
therefore their left-hand-side operand is the value of that column. The match
function will take a JavaScript regular expression instead of SQL SIMILAR’s
regular expression.

### 4.4 Limiters and Order

Lovefield does not support cursor, therefore the paging of rows can only be
done using `limit()` and `skip()` functions offered by select query:

```js
db.select().
    from(infoCard).
    limit(100).
    skip(100).
    orderBy(infoCard.lang, lf.Order.DESC).
    exec();
```

Same as SQL’s `LIMIT` and `SKIP`, the transaction associated with the select
query is a key. If the select queries are not grouped within the same
transaction, there will be no guarantee that these rows won’t overlap or skip
if any insertion/deletion happens in between the select.

The `orderBy()` by default uses ascending order. The implementation needs to
build an iterator that can be traversed in reverse direction as fast as the
designated direction.

### 4.5 Group By and Aggregators

Lovefield provides following aggregation functions to be used with group-by:

|Function        |SQL equivalent |Valid Types for Parameter                |
|:-------------- |:------------- |:--------------------------------------- |
|`lf.fn.avg`     |`AVG`          |`number`, `integer`                      |
|`lf.fn.count`   |`COUNT`        |Any type                                 |
|`lf.fn.distinct`|`DISTINCT`     |Any type                                 |
|`lf.fn.max`     |`MAX`          |`number`, `integer`, `string`, `datetime`|
|`lf.fn.min`     |`MIN`          |`number`, `integer`, `string`, `datetime`|
|`lf.fn.stddev`  |`STDDEV`       |`number`, `integer`                      |
|`lf.fn.sum`     |`SUM`          |`number`, `integer`                      |

A `SyntaxError` is thrown if an aggregation function is used with a column of
an invalid type. Lovefield supports only single-column group by. Multi-column
`GROUP BY`, `ROLLUP`, and `CUBE` are not supported for now.

```js
db.select(customer.name, lf.fn.count(order.id)).
    from(order, customer).
    where(order.customerId.eq(customer.id)).
    groupBy(customer.name).exec();
```

Just like SQL, the search conditions in `where()` does not support aggregators.
Lovefield does not support `HAVING`. The users can do two queries or simply
filter out the selected results.


### 4.6 Column aliases

Each selected column can have alias that will affect their representation in
selected results. All aliased columns are flattened (i.e. no prefix). For
example:

```js
var infoCard = db.getSchema.getInfoCard();
var q1 = db.select(
    infoCard.id,  // No alias
    infoCard.lang.as('Language'),  // Aliased
    infoCard.fileName.as('File Name'));
q1.exec().then(function(rows) {
  // No prefix, context involves only one table
  // console.log(rows[0]['id'], rows[0]['Language'], rows[0]['File Name']);
});

var asset = db.getSchema.getAsset();
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

### 4.7 Table aliases
Each table can have an alias that will affect the format of the returned
results. Table aliases have no effect if only one table is involved in a query.
Table aliases are required for executing a self table join.

```js
// Finds  all job pairs where the min salary of the first job is equal to the
// max salary of the second. This query is not possible without using a table
// alias.
var j1 = db.getSchema().getJob().as('j1');
var j2 = db.getSchema().getJob().as('j2');
var q = db.select(j1.title, j2.title, j1.minSalary).
    from(j1, j2).
    where(j1.minSalary.eq(j2.maxSalary));

q1.exec().then(function(rows) {
  rows.forEach(fuction(row) {
    console.log(
        row['j1']['title'],
        row['j2']['title'],
        row['j1']['minSalary']);
  };
});
```
