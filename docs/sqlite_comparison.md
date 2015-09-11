# Lovefield/Sqlite Feature Parity

This doc intends to provide a rough feature parity comparison for SQLite and
Lovefield.

## SQL Syntax

The original SQLite SQL syntax can be found [here](
https://www.sqlite.org/lang.html).

| SQLite             | Lovefield                                              |
|--------------------|--------------------------------------------------------|
|`EXPLAIN`           |`explain`, but the information provided is not as rich. |
|Aggregate Functions |Supports everything except `group_concat`.              |
|Simple Functions    |See [SQL Simple Functions](#sql-simple-functions).      |
|`ANALYZE`           |*Not implemented.*                                      |
|`ATTACH DATABASE`   |Not applicable.                                         |
|`COLLATE`           |*Not implemented. No plan to support in the future.*    |
|`TRANSACTION`       |`createTransaction` is similar but not the same. Need some syntactical translation.|
|`INDEX`             |Done in schema definition. Does not support `WHERE` clause for indices.|
|`TRIGGER`           |Only supports `SELECT` trigger by using observers.      |
|`VIEW`              |*Not implemented. No plan to support in the future.*    |
|`VIRTUAL TABLE`     |Not applicable.                                         |
|Date/Time Functions |User shall use JavaScript.                              |
|`DELETE`            |Supported, except `ORDER BY LIMIT OFFSET`. No truncate optimization.|
|`DETACH DATABASE`   |Not applicable.                                         |
|`DROP INDEX`        |Implicit drop index implemented in upgrade procedure.   |
|`DROP TABLE`        |`dropTable` in database upgrade.                        |
|Expressions         |See [SQL Expressions](#sql-expressions) section below.  |
|`INDEXED BY`        |Not applicable.                                         |
|`INSERT`            |Supports only `INSERT (OR REPLACE) INTO table VALUES (scalars)`|
|`ON CONFLICT`       |Supports only `ON CONFLICT ROLLBACK`.                   |
|`PRAGMA`            |Not applicable.                                         |
|`REINDEX`           |Not applicable.                                         |
|`SAVEPOINT`         |*Not implemented. No plan to support in the future.*    |
|`SELECT`            |See [SELECT](#select) below.                            |
|`UPDATE`            |Supports only `UPDATE table SET (column=scalar, ...) WHERE expr`.|
|`VACUUM`            |*Not implemented. No plan to support in the future.*    |
|`WITH`              |*Not implemented. No plan to support in the future.*    |


### Transaction Model
The immediate transaction model does not exist in SQLite:

```js
var tx = db.createTransaction();
tx.exec([query1, query2]).then(committed, rolledBack);
```

The syntax above auto-commit/rollback both queries. To manually control
transaction commit/rollback like in SQLite, one need to use following syntax:

```js
// Suppose there are two queries, q1 and q2, using table t1 and t2.
var tx = db.createTransaction();

// Equivalent to BEGIN TRANSACTION, but you need to give the scope explicitly.
tx.begin([t1, t2]).then(function() {
  return tx.attach(q1);
}).then(function(results) {  // results carry results performed by q1
  return tx.attach(q2);
}).then(function() {
  // Commit transaction and flush everything to persistent store.
  // If rollback() is called instead, the whole transaction will be cancelled.
  return tx.commit();
});
```

### SQL Expressions
Lovefield uses a combination of JavaScript expression and Lovefield-provided
operators to achieve most functionalities provided by SQL expressions.

| SQLite operators   | Lovefield                                              |
|--------------------|--------------------------------------------------------|
|`||`                |User shall use JavaScript to concatenate strings.       |
|`* / % + -`         |User shall use JavaScript for arithmetic operations.    |
|`<`                 |`<column>.lt`                                           |
|`<=`                |`<column>.lte`                                          |
|`>`                 |`<column>.gt`                                           |
|`>=`                |`<column>.gte`                                          |
|`= ==`              |`<column>.eq`                                           |
|`!= <>`             |`<column>.neq`                                          |
|`IS`                |Supports only `IS NULL` using `<column>.isNull`.        |
|`IS NOT`            |Supports only `IS NOT NULL` using `<column>.isNotNull`. |
|`NOT`               |`lf.op.not`                                             |
|`IN`                |`<column>.in`                                           |
|`LIKE MATCH REGEXP` |`<column>.match` is similar, but use JS regex instead.  |
|`GLOB`              |*Not implemented. No plan to support in the future.*    |
|`AND`               |`lf.op.and`                                             |
|`OR`                |`lf.op.or`                                              |
|`BETWEEN`           |`<column>.between`                                      |
|`CASE`              |User shall use JavaScript switch-case.                  |
|`EXISTS`            |*Not implemented.*                                      |
|Scalar subqueries   |*Not implemented.*                                      |
|`ROWID OID _ROWID_` |Internally implemented, not open to the users.          |
|`CAST`              |*Not implemented.*                                      |


### SQL Simple Functions
#### Core Functions

| SQL Function       | Lovefield                                              |
|--------------------|--------------------------------------------------------|
|`abs`               |User shall use JavaScript `Math.abs`.                   |
|`changes`           |Has equivalent by using observers.                      |
|`char`              |User shall use JavaScript string functions.             |
|`coalesce`          |*Not implemented.*                                      |
|`glob`              |*Not implemented. No plan to support in the future.*    |
|`ifnull`            |*Not implemented. No plan to support in the future.*    |
|`instr`             |*Not implemented. No plan to support in the future.*    |
|`hex`               |Internally implemented, not open to the users.          |
|`last_inset_rowid`  |*Not implemented. No plan to support in the future.*    |
|`length`            |User shall use Javascript `length`.                     |
|`like`              |*Not implemented. No plan to support in the future.*    |
|`likelihood`        |*Not implemented. No plan to support in the future.*    |
|`likely unlikely`   |*Not implemented. No plan to support in the future.*    |
|`load_extension`    |*Not implemented. No plan to support in the future.*    |
|`lower`             |User shall use JavaScript `toLowerCase`.                |
|`ltrim rtrim trim`  |User shall use JavaScript `trim`.                       |
|`max`               |`lf.fn.max`, only works for SELECT aggregation.         |
|`min`               |`lf.fn.min`, only works for SELECT aggregation.         |
|`nullif`            |*Not implemented. No plan to support in the future.*    |
|`printf`            |*Not implemented. No plan to support in the future.*    |
|`quote`             |*Not implemented. No plan to support in the future.*    |
|`random`            |User shall use JavaScript `Math.random`.                |
|`randomblob`        |*Not implemented. No plan to support in the future.*    |
|`replace`           |User shall use JavaScript string search/replace.        |
|`round`             |User shall use JavaScript rounding.                     |
|`soundex`           |*Not implemented. No plan to support in the future.*    |
|`sqlite_*`          |Not applicable.                                         |
|`substr`            |User shall use JavaScript string functions.             |
|`totalchanges`      |Has equivalent by using observers.                      |
|`typeof`            |*Not implemented.*                                      |
|`unicode`           |JavaScript by default is Unicode.                       |
|`zeroblob`          |*Not implemented. No plan to support in the future.*    |


#### Date-Time Functions
Lovefield uses JavaScript date functions instead of SQL date-time functions.

### SELECT

The equivalent SQL syntax graph for Lovefield's `select()` syntax is illustrated
below:

```sql
SELECT ->          -> result-column -> FROM -> table       ->
       -> DISTINCT         ^,v                  ^,v
                                            -> join clause

  WHERE -> expr -> GROUP BY -> column-name -> ORDER BY -> ordering-term ->

  LIMIT -> scalar -> SKIP -> scalar -> o


join-clause:
  o -> table -> INNER      -> JOIN -> ON expr -> o
             -> LEFT OUTER

ordering-term:
  o -> column-name ->      -> o
                   -> ASC
                   -> DESC

result-column:
  o -> *
    -> column-name ->                 -> o
                   -> AS column-alias
```

The main differences are `GROUP BY`, `LIMIT`, and `OFFSET` does not take
expressions; they accept scalars only. Currently `GROUP BY` accepts only one
table. Lovefield also does not support `HAVING`.

The search condition (a.k.a. `WHERE` clause) and uses expression describe in the
[SQL Expressions](#sql-expressions) section above.


## Features on Roadmap

The following features are on Lovefield's roadmap for SQLite feature parity, but
not implemented yet (as of September 10, 2015).

* CASCADED DELETE/UPDATE
* Cross-column index allowing nullable columns
* LEFT OUTER JOIN accepting conditions
* (Scalar) Expression and/or custom functions

