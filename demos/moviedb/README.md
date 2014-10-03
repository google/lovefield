Example usage of Lovefield for a small movie database. To generate the necessary
code to run the demo run the following command replacing the parts within angle
brackets as needed.

Sample data have kindly been provided by UCLA professor Junghoo "John" Cho's
database class at http://oak.cs.ucla.edu/cs143/project/data/data.zip.

```bash
bash ../../tools/bundle.sh \
  --schema moviedb_schema.yaml \
  --namespace movie.db \
  --outputdir . \
  --compiler <path/to/compiler.jar> \
  --library <path/to/closure-library>
```

Start a local HTTPServer running the following command
```bash
python -m SimpleHTTPServer 60000
```

See the demo by visiting
http://localhost:60000/demo.html
