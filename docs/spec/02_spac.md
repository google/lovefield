# Lovefield Specification

## 2. Schema Parsing and Code Generation

The schema JSON file will need to be parsed and validated by Schema Parser And
Code-Generator (SPAC). SPAC will generate JavaScript code providing:

* A static function used to create database instance.
* A database schema class that can be used to create query conditions.
* A database instance class that can be used to create queries.

The following example is the very basic SCUD operation using SPAC generated
code, assume the namespace passed into SPAC is `my.namespace.db`:

```js
var db;
var infoCard;

function createRows() {
  // Method 1: use lovefield-generated functions
  var row = infoCard.createRow();
  row.setId('something');
  row.setLang('en');
  row.setItag(140);
  row.setCountry('US');
  row.setFileName('140-en-US');

  // Method 2: directly pass in JSON object
  var row2 = infoCard.createRow({
    'id': 'something',
    'lang': 'fr',
    'itag': 145,
    'country': 'FR',
    'fileName': '145-fr-FR'
  });
  return [row, row2];
}

// <namespace>.<instanceName>.getInstance() to get DB instance
my.namespace.db.getInstance().then(function(dbInstance) {
  db = dbInstance;
  infoCard = db.getSchema().getInfoCard();

  // INSERT INTO InfoCard VALUES (...);
  var rows = createRows();
  return db.insert().into(infoCard).values(rows).exec();
}).then(function() {
  // SELECT id, lang, fileName FROM InfoCard
  //   WHERE id = 'something' AND lang = 'en';
  db.select([infoCard.id, infoCard.lang, infoCard.fileName]).
    from(infoCard).
    where(lf.op.and(
        infoCard.id.eq('something'), infoCard.lang.eq('en'))).
    exec().then(function(rows) {
      console.log(rows[0].id, rows[0].lang, rows[0].fileName);
    });

  // UPDATE InfoCard SET lang = 'fr' WHERE id LIKE 'whatever%'
  return db.update(infoCard).
      set(infoCard.lang, 'fr').
      where(infoCard.id.like(/^whatever/)).
      exec();
}).then(function() {
  // DELETE FROM InfoCard WHERE lang = 'es';
  var q = db.delete().from(infoCard).where(infoCard.lang.eq('es'));
  return q.exec()
});
```

### 2.1 Namespace and DB name

The user already specified a DB name in schema, and a "namespace" is also
required in SPAC. These two names are serving different purposes.

A DB name uniquely identifies the DB persisted. It is only useful for opening
database.

A namespace is used to encapsulate Lovefield generated code for a given DB
schema. Each namespace can have only one DB.

If the users wanted to change namespace without changing DB schema, they can
use the same schema YAML file, but give SPAC a different namespace. The
resulting code will be opening the same database file.

### 2.2 Implicit Data Conversion

Some data types will be implicitly converted when stored into DB. The
conversion is shown in following table:

| Original Type | Stored Type                                |
|:------------- |:------------------------------------------ |
|arraybuffer    |string (encoded in hex)                     |
|boolean        |boolean                                     |
|date           |number (timestamp, milliseconds since epoch)|
|integer        |number                                      |
|number         |number                                      |
|string         |string                                      |

The data will be converted again to user-specified types when retrieved from
database.

### 2.3 Automatically Generated Classes

The SPAC will automatically generate following:

| Classes/Functions           | Note                    |
|:--------------------------- |:----------------------- |
|`<namespace>.getInstance()`  | Database initialization |
|`<namespace>.Database`       | Database class          |
|`<namespace>.row.<table>`    | Row type of each table  |
|`<namespace>.schema.Database`| Database Schema         |
|`<namespace>.schema.<table>` | Schema of each table    |
|`<namespace>.Transaction`    | Transaction class       |
