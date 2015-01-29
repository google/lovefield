var ClosureCompiler = require(__dirname+"/../ClosureCompiler.min.js");

ClosureCompiler.compile(__filename, {}, function(error, result) {
    if (error) {
        throw(error);
    }
    console.log("--- SUCCESS ---\n"+result);
    process.exit(0);
});
