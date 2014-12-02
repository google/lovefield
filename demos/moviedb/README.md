Example usage of Lovefield for a small movie database. To generate the necessary
code to run the demo run the following command replacing the parts within angle
brackets as needed.

Sample data have kindly been provided by UCLA professor Junghoo "John" Cho's
database class at http://oak.cs.ucla.edu/cs143/project/data/data.zip.

```bash
lovefield-spac \
  --schema moviedb_schema.yaml \
  --namespace movie.db \
  --outputdir lib
```

The command will create `lib/database.js` and `lib/schema.js`. Let's copy the
Lovefield dist file to `lib/`, too:

```bash
cp ../../dist/lovefield.min.js lib
```

Now start a local HTTPServer by running the following command

```bash
python -m SimpleHTTPServer 60000
```

See the demos by visiting
http://localhost:60000/
