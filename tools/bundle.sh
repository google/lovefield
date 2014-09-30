#!/bin/bash

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

# Java path
JAVA=${JAVA:-java}

# Closure compiler path
CLOSURE_COMPILER=${CLOSURE_COMPILER}

# Closure library path
CLOSURE_LIBRARY=${CLOSURE_LIBRARY}

# Node.js path
NODEJS=${NODEJS:-node}

# Lovefield path
LOVEFIELD=$SCRIPT_DIR/..

function usage {
  echo "Usage:"
  echo "bundle.sh"
  echo "  --schema <database schema file path>"
  echo "  --namespace <namespace to use in code>"
  echo "  --compiler <Closure compiler path> (optional)"
  echo "  --library <Closure library path> (optional)"
  echo "  --outputdir <output path> (optional)"
  exit 1
}

[ $# -lt 5 ] && usage

# Parse command line options
while [[ $# > 1 ]]
do
  key="$1"
  shift

  case $key in
    -c|--compiler)
      CLOSURE_COMPILER=$(readlink -f "$1")
      shift
      ;;

    -l|--library)
      CLOSURE_LIBRARY=$(readlink -f "$1")
      shift
      ;;

    -n|--namespace)
      NAMESPACE="$1"
      shift
      ;;

    -s|--schema)
      SCHEMA_FILE=$(readlink -f "$1")
      shift
      ;;

    -o|--outputdir)
      OUTPUT_PATH=$(readlink -f "$1")
      shift
      ;;

    *)
      # Unknown option
      ;;

  esac
done

[ -z $CLOSURE_COMPILER ] || [ ! -f $CLOSURE_COMPILER ] && \
  echo "Must set CLOSURE_COMPILER or provide --compiler" && exit 1

[ -z $CLOSURE_LIBRARY ] || [ ! -d $CLOSURE_LIBRARY ] && \
  echo "Must set CLOSURE_LIBRARY or provide --library" && exit 1

OUTPUT_PATH=${OUTPUT_PATH:-$(dirname $SCHEMA_FILE)}

$NODEJS $LOVEFIELD/spac/spac.js --schema=$SCHEMA_FILE \
    --namespace=$NAMESPACE --outputdir=$OUTPUT_PATH

NS=$OUTPUT_PATH/
NS+=`echo $NAMESPACE | sed -e 's/\./_/g'`
DBJS=_database.js
SCJS=_schema.js
TXJS=_transaction.js
OBJS=_observer.js
BDJS=_bundle.js

$CLOSURE_LIBRARY/closure/bin/build/closurebuilder.py \
    --root=$LOVEFIELD/lib \
    --root=$CLOSURE_LIBRARY \
    --output_mode=compiled \
    --namespace=$NAMESPACE \
    --compiler_jar=$CLOSURE_COMPILER \
    --compiler_flags="--language_in=ECMASCRIPT5_STRICT" \
    $NS$DBJS $NS$SCJS $NS$TXJS $NS$OBJS > $NS$BDJS

rm $NS$DBJS $NS$SCJS $NS$TXJS $NS$OBJS
