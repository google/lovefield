# Lovefield Design Document

## 0. Introduction

Lovefield is a relational query engine and is built in a way very similar to
traditional RDBMS in many aspects. In this chapter, the design philosophy of
Lovefield and basic driving factors will be discussed.

### 0.1 Motivation

The best thing of software engineering is that most problems can be solved in
different ways. Object databases and relational database are invented to solve
data access problems from different points of view and requirements.
Unfortunately the support of relational databases in browsers is in an
unsatisfactory state after WebSQL being deprecated, and thus Lovefield is
created to offer the choice that developers shall be honored to have.

### 0.2 Data Store

Originally Lovefield was bundled with IndexedDB only. Per popular requests, it
is now engineered to wrap different storage technologies into a separate layer,
and is able to couple different storage technologies with the query engine.

The supported data store types are:

* IndexedDB - All data persisted on IndexedDB
* Memory - All data are transient and stored in-memory

There are several experimental data stores:

* WebSQL - Provided to fill in the gap of Safari lacking IndexedDB support
* Firebase - Provided to test server-to-client end-to-end solution

Each storage technology has different limitations and constraints. Lovefield
contributors are required to have a good understanding of these boundary
conditions and handle them so that the users of Lovefield are relieved from
such trickiness.

### 0.3 Constraints of JavaScript/General HTML5

There is simply not a way to measure how much heap is allocated within
JavaScript. As a result, precise memory management is non-existent by
JavaScript-based programs. What Lovefield can do is to provide different means
for its users to lower their memory usage and lower Garbage Collector pressure.

### 0.4 Use of Closure Library/Compiler

Lovefield is developed using Closure Library, mainly because the original
developers are more familiar with it. Similar reason for choosing JUnit as
the test infrastructure. Since Lovefield is designed to be used cross-browser
and cross-framework, it has to ship with all its dependencies. Therefore usage
of Closure library is consciously limited to the smallest possible set so that
size of the shipped library can be smaller.

Lovefield's codebase is checked by Closure compiler with very strict options.

### 0.5 Components of Lovefield

Lovefield consists following components:

* Schema Parser and Code-generator (SPAC, `spac/`)
* Schema (`lib/schema/`)
* Caching support (`lib/cache/`)
* Query engine
    * Query builder (`lib/query/`)
    * Relation, query plan generator/optimizer/runner (`lib/proc/`)
    * Predicates (`lib/pred/`)
* Data store management (`lib/backstore/`)
* Indices (`lib/index/`)

These components will be detailed in following chapters.

### 0.6 Design Principles

* No hack policy: do not attempt to replace or augment JavaScript built-in
  objects and their prototypes.
* Use of global namespace (`window.*`) is strictly forbidden.
* Schema related APIs shall remain synchronous until `connect()`.
* Query related APIs shall be as close to SQL syntax as possible. Do not
  change the order or terminology unless absolutely necessary (e.g. `AND`
  operator).
