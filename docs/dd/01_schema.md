# Lovefield Design Document
## 01. Schema Design

### Row
For any RDBMS, the basic unit of storage and query is a row. In Lovefield, a row has a unique row id that is assigned by the system at the time of row creation, and the row id will be associated with that row until it is deleted from the database. Row id, as a JavaScript number, has a data range between 0 and 2^53 - 1, which shall be way more than enough for a small database. Unique row id is key for the query engine to function correctly.

A row consists of columns, and the columns are defined in schema. Lovefield SPAC will generate different Row classes that provide essential access to the row in a friendly and type-safe way. (Type safety is provided by Closure Compiler if and only if used correctly).

### Schema
Schema syntax is defined in the specification. The more interesting things are the design decisions behind the presentation.

#### Why Use a Protobuf-like Model?
JavaScript itself is a very dynamic language and one is able to inject whatever code on-the-fly. Why Lovefield opt to use Protobuf-like model, which is mainly designed for static languages like C/C++? The reasons are: better compiler coverage, less loading time, easier to test and maintain, and can be optimized by compiler. It also allows us to use other formats than JSON to define our schema.

#### Why YAML? Or, Why Not JSON?
Originally Lovefield uses JSON as its schema definition format. JSON is not as readable as the YAML format since it lacks built-in support for comments, and it also has a lot of unnecessary marks. By converting JSON to YAML, the test schema we use (`spac/testdata/codegen.yaml`) has 55% less lines and is way more readable.

#### Why Use node.js?
The reason node.js is chosen to built SPAC is to simplify languages used in this project. Many projects assume everybody must learn at least N languages to survive. The founder of Lovefield, Arthur Hsu, said that he is too old to learn new tricks so the N is better less than or equals to 1. As a result node.js it is since JavaScript is unavoidable for this project.

### Default Names
Lovefield assigns default names to primary key indices to be pk&lt;TableName&gt;. This is based on a trade-off to simplify primary key definition syntax in the YAML file. This maybe changed in the future if there are enough requests from the users to name their primary key.
