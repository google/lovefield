#!/bin/bash
if [ "$SELENIUM_BROWSER" == "builder1" ]; then
  gulp build --target=lib --mode=opt
  gulp test --target=spac
  gulp build --target=tests --filter=tests/backstore --filter=tests/base --filter=tests/cache --filter=tests/harness
elif [ "$SELENIUM_BROWSER" == "builder2" ]; then
  gulp build --target=tests --filter=tests/index --filter=tests/proc
else
  gulp build --target=tests --filter=tests/pred --filter=tests/query --filter=tests/schema --filter=tests/smoke --filter=tests/structs
fi

