/*
 * Copyright 2012 The Closure Compiler Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Validate Script: Tries to validate the existing externs by including them in a compile step.
 */

var ClosureCompiler = require("closurecompiler"),
    fs = require("fs");

var externs = [];
var pattern = /\.js$/;
var files = fs.readdirSync(".");
for (var i=0; i<files.length; i++) {
    if (pattern.test(files[i])) {
        externs.push("./"+files[i]);
    }
}
/* files = fs.readdirSync("./contrib");
for (i=0; i<files.length; i++) {
    if (pattern.test(files[i])) {
        externs.push("./contrib/"+files[i]);
    }
} */

console.log("Validating "+externs.length+" files:\n", externs);
ClosureCompiler.compile("./tests/noop.js", {
	"compilation_level": "ADVANCED_OPTIMIZATIONS",
	"warning_level": "verbose",
	"externs": externs
}, function(error, result) {
    if (error) {
        throw(error);
    }
    console.log("✔ All externs validate");
});
