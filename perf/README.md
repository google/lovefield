# Lovefield Performance Benchmark

## Tests

The following categories of benchmark tests are orchestrated.

* Loading: measures time of loading an empty DB and a populated DB (with 20K
  rows).

* Full table SCUD: perform bulk insert/update/select/delete on
  10K/20K/30K/40K/50K rows for both IndexedDB (Full table SCUD) and MemDB
  (Full table SCUD Mem). The queries performed are guaranteed to be executed by
  a plan of full table scan.

* PK-based SCUD: similar to full table SCUD, but this time a primary key (i.e.
  unique B+-Tree index) will be involved in all SCUD operations.

* Select: exhaustively test different select scenarios for both IndexedDB and
  MemDB:
  * Select single row with predicates
    * Indexed
    * Partially indexed (i.e. using only one key for a two-key index)
    * Non-indexed
  * Select many rows with predicates
    * Indexed range scan for continuous range
    * Indexed "spaced out", means the column to be searched is indexed, but
      non-continuous. For example, pick 1, 10, 20, 30 from an indexed column.
    * Non-indexed
    * Non-indexed spaced out
  * Select all with projections
    * Select all
    * Select aggregations, and the aggregated column is indexed.
    * Select aggregations, but the aggregated column is not indexed.
  * Select all with ordering
    * The ordered by column is indexed.
    * The ordered by column is partially indexed.
    * The ordered by column is not indexed.
    * When limit and skip is present and the ordered by column is indexed.
  * Select all with join operation
    * "Equi": simple inner join, WHERE e.jobId == j.id
    * "Theta": combined search condition,
      WHERE e.jobId == j.id AND e.salary > j.maxSalary

* Scenario: simulates one scenario of real-world usage, MemDB only
  * Insertion of 1K rows via tx.attach()
  * Select 1K rows via 1K parallel queries
  * Select 1K rows via 1K parallel queries, reusing the query builder via
    parameterized query.

## Testing Configurations

The tests are run on an Ubuntu workstation with Dual Xeon 2690 2.9GHz,
64GB RAM, 7200rpm SATA-II drive. Tests are performed Monday to Friday on latest
Chrome browser stable version.

The numbers can be queried using the dashboard provided in the source code.
