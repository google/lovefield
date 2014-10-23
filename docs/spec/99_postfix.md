# Lovefield Specification

## Experimental Features

### Bundled Mode

Bundled mode can be enabled by adding a pragma section in the schema:

```yaml
%YAML 1.2
---
name: mydb
version: 1
pragma:
  enableBundledMode: true
table:
  ...
```

In bundled mode, Lovefield will store rows differently. Internally Lovefield assigns a unique row id to each logical row. In bundled mode, Lovefield will bundle multiple (up to 1024) logical rows into one physical row in IndexedDB.

Per [current IndexedDB spec](http://www.w3.org/TR/2013/CR-IndexedDB-20130704/), the only way to load all rows from an IndexedDB table is

```js
var req = objectStore.openCursor();
req.onsuccess = function() {
  if (cursor) {
    // get one row by using cursor.value
    cursor.continue();
  } else {
    // finished
  }
};
```

This code snippet involes N calls of cursor.continue and N eventing of onsuccess, which is very expensive when N is big. WebKit needs 57us for firing an event on an HP Z620, and the wall clock time for loading 100K rows just for firing N onsuccess events will be 5.7 seconds, not to mention the callback processing time. Lovefield provides this bundled mode to accelerate initial bootstrapping speed by bundling logical rows together. There can be other performance-related consequences for this approach and thus this feature is marked as experimental.

Users who enabled bundled mode needs to keep the following facts in mind:

* Bundled mode is designed mainly for data tables with 50K+ rows. Smaller database may experience slower performance by enabling bundle mode. User is supposed to benchmark and determine if bundled mode is feasible.
* There is no support for converting non-bundled to bundled database, and vice versa. Manual conversion is possible but will not be easy.

## Future Features

### Advanced Grouping

Support for group by multi columns, ROLLUP, and CUBE equivalent.

### Multi-Connection

Allow multiple browser process to connect to same database and all the in-memory snapshots are in-sync. (This may require W3C spec support.)

## References

[BNF Grammar for ISO/IEC 9075-2:2003 - Database Language SQL (SQL-2003) SQL/Foundation](http://savage.net.au/SQL/sql-2003-2.bnf.html)
