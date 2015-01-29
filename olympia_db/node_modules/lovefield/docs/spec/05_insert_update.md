# Lovefield Specification

## 5. Insert and Update Queries

There are two different insertion queries: `insert()` and `insertOrReplace()`; the former will throw an error if found primary key violation, while the latter will just update it. Since Lovefield does not support cursor and sub-query, all values for insertion must be prepared before calling `exec()` for that query. Users need to be careful about possible memory/GC consequences for bulk insertion.

### 5.1 Prepare Rows for Insertion

Users must use `createRow()` function provided in generated schema to create a row. Each row object will have corresponding field setting methods to perform necessary type checking. For example:

```js
var row = infoCard.createRow();
row.setId('something');
row.setLang(140);  // internally converted to string

// Cascading is also okay
var row2 = infoCard.createRow().setId('something2').setLang(150);
```

All insert queries assumes multiple rows will be inserted at the same time, therefore the user must embed their row in an array even if there is only one.

```js
db.insertOrReplace().into(infoCard).values([row]).exec();
```

All functions provided by insert queries can only be called once, otherwise an exception will be raised.

### 5.2 Update Queries

Update queries are acquired using `update()`, and the user must pass in the target table as its parameter. The updated values are provided by the `set()` clause, as shown below:

```js
// UPDATE order SET amount = 51, currency = 'EUR'
//   WHERE currency = 'DEM' AND amount = 100;
db.update(order).
    set(order.amount, 51).
    set(order.currency, 'EUR').
    where(lf.op.and(
        order.currency.eq('DEM'), order.amount.eq(100)));
```

The `where()` function is shared with select query. All functions provided by update query, except the `set()` function, can only be called once.
