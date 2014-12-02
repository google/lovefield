# Quick Start Guide for Lovefield

## Prerequisites

### [node.js](http://nodejs.org)

Besides using the installer from nodejs.org, you can also use
[nvm](https://github.com/creationix/nvm) to install node.js.

### Install SPAC

SPAC is the Lovefield Schema Parser and Code-generator, which is used to
generate code from your DB schema. To install SPAC, you need to use `npm`:

```bash
cd spac/
npm install -g
```

SPAC is not registered in NPM package list yet because it is tightly coupled
with the source code. Due to the high code velocity of Lovefield, it is
suggested to pull down Lovefield source and do npm install from there.

## How to Use Lovefield

There are three steps to use Lovefield in your code:

1. Define schema
2. Generate JavaScript files from the schema
3. Use the generated code

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

### Code Generation

Use `lovefield-spac` to generate code for your schema.

```bash
lovefield-spac \
  --schema my_schema.yaml \
  --namespace my.namespace \
  --outputdir mypath
```

Running `lovefield-spac` without any arguments will give you the usage. The
`namespace` here is a namespace for all generated code to be placed in.
Lovefield has a philosophy of not polluting the global namespace so it will
place all generated code under the namespace you designated.

By default `lovefield-spac` will generate one single file
`<escaped_namespace>_gen.js`. You'll need to include this file into your code
after including `dist/lovefield_min.js`.


### Use in code

For Closure Library users, please read the [special instructions]
(quick_start.md#special_instructions). If you don't use Closure Library, you can
do the following:

```html
<script src="mypath/lovefield.min.js"></script>
<script src="mypath/my_namespace_gen.js"></script>
<script>
my.namespace.getInstance().then(
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

The file `lovefield.min.js` can be found at `dist/`. You can also use the debug
version, `lovefield.js`, for debugging purposes.

## Special Instructions

The special instructions are for Closure library users or the developers of
Lovefield library. For convenience, the Lovefield distribution includes all the
Closure library dependencies used. As a result, Closure library users need to
compile Lovefield with their code instead of using the dist file directly.

If you work for Google and would like to use Lovefield inside Google, please
`go/lovefield` for more details.
