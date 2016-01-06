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
details, see [design doc](../dd/02_data_store.md#232-bundled-mode-experiment).


## Future Features

### Advanced Grouping

Support for ROLLUP and CUBE equivalent.

### Multi-Connection

Allow multiple browser process to connect to same database and all the in-memory
snapshots are in-sync. (This may require W3C spec support.)

## References

[BNF Grammar for ISO/IEC 9075-2:2003 - Database Language SQL (SQL-2003) SQL/Foundation](http://savage.net.au/SQL/sql-2003-2.bnf.html)
