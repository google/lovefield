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

Bundled mode is created to workaround IndexedDB spec inefficiencies. For more
details, see [design doc](../dd/03_backstore.md).


### Persistent Index

Currently Lovefield implementation generates all indices on-the-fly during
initialization process. This is a naive design that needs to be polished. An
experimental feature named persistent index is used to further polish it.
Persistent indices can be specified in the schema:

```yaml
%YAML 1.2
---
name: mydb
version: 1
table:
  Foo:
    column:
      id: string
      name: string
      bar: string
    constraint:
      primaryKey: [ bar ]
      unique:
        uq_bar:
          column: [ bar ]
    index:
      idx_Name:
        column: [ name ]
    pragma:
      persistentIndex: true
```

Persistent index is specified at table level. This attribute not only affects
the indices being stored permanently but also the algorithm to use (B-Tree vs
AA-Tree) and table delay loading behavior.


## Future Features

### Advanced Grouping

Support for group by multi columns, ROLLUP, and CUBE equivalent.

### Multi-Connection

Allow multiple browser process to connect to same database and all the in-memory
snapshots are in-sync. (This may require W3C spec support.)

## References

[BNF Grammar for ISO/IEC 9075-2:2003 - Database Language SQL (SQL-2003) SQL/Foundation](http://savage.net.au/SQL/sql-2003-2.bnf.html)
