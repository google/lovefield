# Lovefield Design Document

## 0. Introduction

Lovefield is a relational database and is built in a way very similar to
traditional RDBMS in many aspects. In this chapter, the design philosophy of
Lovefield and basic driving factors will be discussed.

### 0.1 Motivation

The best thing of software engineering is that most problems can be solved in
different ways. Object databases and relational databases are invented to solve
data access problems from different points of view and requirements.
Unfortunately the support of relational databases in browsers is in an
unsatisfactory state after WebSQL being deprecated, and thus Lovefield is
created to offer the choice that developers shall be honored to have.

### 0.2 Data Store

Lovefield abstracts data persistence into classes implementing `lf.BackStore`.
This makes Lovefield adaptive to different storage media and technologies.
This also helps to decouple storage from the query engine.

The supported data stores are:

* IndexedDB - All data persisted on IndexedDB provided by browser.
* Memory - All data are transient and stored in-memory.
* Firebase - Data is persisted in Firebase, a cloud database that synchronized
  among all its clients.

There are several experimental data stores:

* WebSQL - (DEPRECATED) Provided to fill in the gap of legacy Safari lacking
  IndexedDB support.
* LocalStorage - Provided for proof of concept for handling external changes.

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

* Schema Management (`spac/` and `lib/schema`)
* Caching and Memory Management (`lib/cache/`)
* Query engine
    * Query builder (`lib/query/`)
    * Relation, query plan generator/optimizer/runner (`lib/proc/`)
    * Predicates (`lib/pred/`)
* Data stores (`lib/backstore/`)
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

### 0.7 API Design

Although Lovefield's APIs look deceptively simple, the design behind it involves
a lot of mind works. The general ideas are:

* A set of APIs that are very friendly to SQL users offering most of SQL goodies
* And avoid possible SQL injections
* And can work with different JavaScript frameworks

Similar works have been done before (e.g. Microsoft LINQ or FOAM framework).
From implementation point of view, this type of syntax makes sense:

```js
db.from(job)
  .where(function(x) { return x.id < 200; })
  .select();
```

However, this breaks one major advantage of SQL: it just reads like natural
language. Why should we care about "reading naturally"? Because we developers
read way more code in our career than writing. APIs that can be read naturally
are easier to use, maintain, and debug. So how about this version?

```js
db.select()
  .from(job)
  .where(function(x) { return x.id < 200; })
  .exec();
```

This reads a lot better, in an expense of adding one additional call `exec()`.
The problem of this syntax is that it does not work for relational query engine.
The search conditions are treated as predicate trees that can be optimized. A
user-provided function is not a good candidate for predicates, unfortunately.
So how about this?

```js
db.select()
  .from(job)
  .where(LT(job.id, 200))
  .exec();
```

LT is a provided predicate function. This looks promising and avoids injection
threats. There are two minor problems here:

* It pollutes global namespace: there are a handful operators and many
  aggregation functions for SQL. If there's a symbol collision, it will be
  pain to use (e.g. overriding $ when using jQuery).
* It still does not read naturally.

That's why Lovefield's APIs look like this:

```js
db.select()
  .from(job)
  .where(job.id.lt(200))
  .exec();
```

It is very readable without the drawbacks. However, this syntax poses more
challenges for implementation because now the `job` has to have a property
`id` that has member function `lt`.

The original solution is to use a Schema Parser and Code-Generator (SPAC) to
generate JavaScript code. Lovefield team later developed a run-time solution
without using `eval()`. These topics are further discussed in
[Schema](01_schema.md).

Following this design philosophy, Lovefield maps quite a few semantics from
SQL 03 and therefore has the syntax as documented in
[Specification](../spec_index.md).
