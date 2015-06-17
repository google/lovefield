# Acknowledgement

The demos in this directory show example usage of Lovefield for a small movie
database. The sample data used in the database has kindly been provided by UCLA
professor Junghoo "John" Cho's database class at
http://oak.cs.ucla.edu/cs143/project/data/data.zip.

# How to Run the Demos

* Step 1: Install gulp (if you have not already), ```npm install -g gulp```
* Step 2: Pull dependencies in package.json, ```npm install .```
* Step 3: Start a local webserver, ```gulp debug```
* Step 4: Navigate to [http://localhost:8000](http://localhost:8000),

## demo-jquery

Lovefield + jquery demo, demonstrates table joins.

## demo-binding

Demonstrates Lovefield's parametrized queries + observers features.


## demo-pureidb

Same as demo-jquery but instead of using Lovefield, IDB is used directly (for
timing and code size/complexity comparison).
