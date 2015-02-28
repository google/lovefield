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

### 0.2 Data Store Selection

To build a relational database, the first thing to pick is to decide what data
store to use. The decision process is quite simple: enumerate cross-browser
client-side storage solution and rule out things that does not fit.

  * Local Storage: only 5MB, not really a good idea
  * Cookie Jars: seriously?
  * HTML5 File API: FileSystem and FileWriter API are not cross-platform. In
    fact, they are [discontinued](http://www.w3.org/TR/file-writer-api) and
    [discontinued](http://www.w3.org/TR/file-system-api/).
  * IndexedDB: Everybody supports it or will support it. (Safari support is an
    interesting story, however, that's controlled by Apple.)

So the choice is obvious: IndexedDB it is.

#### 0.2.1 Good Parts of IndexedDB

IndexedDB provides atomic writes and rollback. As a result, there
is no need to implement [ARIES algorithm](http://en.wikipedia.org/wiki/Algorithms_for_Recovery_and_Isolation_Exploiting_Semantics).

#### 0.2.2 Constraints of IndexedDB

Using IndexedDB as the data store creates following constraints:

* IndexedDB itself is an object store. It does not have the concept of
  low-level I/O which was treated as granted in traditional RDBMS.

* Atomic access of IndexedDB is very tricky because of IndexedDB auto-commit
  behavior. For example, IndexedDB commits all pending writes automatically
  when an XHR send is initiated, which can easily catch developers off-guard.

* IndexedDB lacks efficient means for bulk loading/writing.

* IndexedDB loves to fire events, which is a performance killer if not handled
  and tuned carefully.

Lovefield contributors are required to have a good understanding of these
constraints. The goal of Lovefield is to handle these problems so that the
users of Lovefield are relieved from such pains.

### 0.3 Constraints of JavaScript/General HTML5

There is simply not a way to measure how much heap is allocated within
JavaScript. As a result, precise memory management is non-existent by
JavaScript-based programs. What Lovefield can do is to provide different means
for its users to lower their memory usage and lower Garbage Collector pressure.

### 0.4 Use of Closure Library/Compiler

Lovefield is developed using Closure Library, mainly because the original
developers are more familiar with it. Since Lovefield is designed to be used
cross-browser and cross-framework, it has to ship with all its dependencies.
Therefore usage of Closure library is consciously limited to the smallest
possible set so that size of the shipped library can be smaller.

Codebase of Lovefield is checked by Closure compiler with very strict options.
The compilation structure is not ported to GitHub yet, and needs development.

Closure testing infrastructure uses JSUnit, which is sort of obsolete. Due to
the massive number of existing unit tests, the plan is to write Karma plugins
to support JSUnit tests.

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
