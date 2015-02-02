# Acknowledgement

The demos in this directory show example usage of Lovefield for a small movie
database. The sample data used in the database has kindly been provided by UCLA
professor Junghoo "John" Cho's database class at
http://oak.cs.ucla.edu/cs143/project/data/data.zip.

# How to Run the Demos

## Demo-DDL

This demonstrates using Lovefield with run-time schema definition. To run this
demo, simply copy `dist/lovefield.min.js` and `demo-ddl.*` to `lib/`:

```bash
mkdir -p lib
cp ../../dist/lovefield.min.js lib
cp demo-ddl.* lib
```

## Other demos

Other demos uses YAML to define schema. To generate the necessary code to run
the demo, run the following command:

```bash
../../spac/lovefield-spac \
  --schema moviedb_schema.yaml \
  --namespace movie.db \
  --outputdir lib
```

The command will create `lib/movie_db_gen.js`. Let's copy the Lovefield dist
file to `lib/`, too:

```bash
cp ../../dist/lovefield.min.js lib
```

## Run Demo Server

Now start a local HTTPServer by running the following command

```bash
python -m SimpleHTTPServer 8888
```

See the demos by visiting
http://localhost:8888/
