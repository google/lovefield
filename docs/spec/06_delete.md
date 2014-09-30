# Lovefield Specification

## 6. Deletion Queries

Lovefield offered two types of deletion queries: `delete()` and `dropTable()`. The delete query can be used to delete one or more rows with or without search conditions. The drop table query can be used to delete one table, however, it can be called only inside the onUpgrade callback (see [Database Upgrade](03_life_of_db#3.3-Database-Upgrade)).

```js
// DELETE FROM infoCard WHERE lang = 'es';
db.delete().from(infoCard).where(infoCard.lang.eq('es')).exec();
db.delete().from(infoCard).exec();  // Delete everything in infoCard
```
