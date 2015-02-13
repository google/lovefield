# Lovefield Specification

## 7. Execution Plan

Lovefield offered `explain()` which will evaluate the query without actually execute it.

```js
var p = db.getSchema().table('Photo');
var a = db.getSchema().table('Album');
var query = db.select().
    from(p).
    innerJoin(a, p.albumId.eq(a.id)).
    where(a.id.eq('1'));
query.explain();  // DEBUG only
```
