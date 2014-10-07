# Quick Start Guide for Lovefield

## Prerequisites

You need to install the following programs for the [Compile](#compile) step mentioned later in this guide.

### [Python](http://www.python.org) and [Java](http://www.java.com)

For the toolchain included in Lovefield to work correctly, you need to have
Python and Java installed and invocable from PATH.

### [node.js](http://nodejs.org)

Besides using the installer from nodejs.org, you can also use [nvm](https://github.com/creationix/nvm) to install node.js.

You also need to install several modules, and we strongly recommend using [npm](https://www.npmjs.org) for that task. The following modules are required:

1. [glob](https://www.npmjs.org/package/glob)
2. [js-yaml](https://www.npmjs.org/package/js-yaml)
3. [nopt](https://www.npmjs.org/package/nopt)

### Closure compiler and library

Latest Closure compiler and library are required for using Lovefield. Don't worry, your code does not need to depend on the Closure library. They are just used to generate the bundle JS to be included in your code.

To acquire the latest compiler and library, you need to have git installed, and perform the following commands

<pre>
cd closure
git clone https://github.com/google/closure-library.git
git clone https://github.com/google/closure-compiler.git
cd closure-compiler
ant jar
</pre>

We did not download the latest JAR because we need to refer to the externs files in repo.

## How to Use Lovefield

There are three steps to use Lovefield in your code:

1. Define schema
2. Generate a bundled JavaScript file to be used in your code
4. Include the bundled file and start use it

### Define schema

Write a YAML file to define your DB schema:

```yaml
%YAML 1.2
---
name: mydb
version: 1
table:
  Card:
    column:
      id: string
      name: string
```

### Compile

Use nodejs to execute tools/bundle.js to create compiled bundle for your schema. This bundle will auto generate some JavaScript code and compile them with all needed library into a bundled JavaScript file.

```bash
node tools/bundle.js \
  --schema my_schema.yaml \
  --namespace my.namespace \
  --outputdir ~/mypath \
  --compiler ~/src/closure-compiler/build/compiler.jar \
  --library ~/src/closure-library
```

`node tools/bundle.js` will give you the usage. You need to tell it where the Closure compiler and library are, and you can also customize the output path.


### Use in code

```html
<script src="mysrc/mydb_bundle.js"></script>
<script>
mydb.getInstance().then(
  function(db) {
    var card =
      db.getSchema().getCard();
    var query = db.select().
        from(card).
        where(
          card.id.eq('12345'));
    return query.exec();
  }).then(function(results) {
  });
</script>
```
