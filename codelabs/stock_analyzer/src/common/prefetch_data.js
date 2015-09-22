/**
 * @license
 * Copyright 2015 The Lovefield Project Authors. All Rights Reserved.
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

// Script to prefetch historical stock data from Google Finance API. To be used
// as a planB in case there is no network connectivity during demo.
var fsMod = require('fs');
var http = require('http');
var Converter = require('csvtojson').Converter;


function getData(url) {
  return new Promise(function(resolve, reject) {
    http.get(url, function(res) {
      res.setEncoding('utf8');
      res.on('data', resolve);
      res.on('error', reject);
    });
  });
}


function getUrlForStock(stockCode) {
  var template = 'http://www.google.com/finance/historical' +
      '?q={q}&authuser=0&output=csv';
  return template.replace('{q}', stockCode);
}


function csvToJson(csvString) {
  return new Promise(function(resolve, reject) {
    var csvConverter = new Converter({constructResult: true});
    csvConverter.fromString(csvString, function(error, jsonObj) {
      if (error != null) {
        reject(error);
      } else {
        resolve(jsonObj);
      }
    });
  });
}


var stockCodes = [
  'AAPL',
  'GM',
  'GOOG',
  'MSFT',
  'NKE',
  'RL',
  'TM',
  'TSLA',
  'TWTR',
  'UA'
];

stockCodes.forEach(function(stockCode) {
  getData(getUrlForStock(stockCode)).then(
      function(body) { return csvToJson(body); }).then(
      function(jsonObj) {
        var filename = stockCode + '.json';
        if (!fsMod.existsSync('data')) { fsMod.mkdirSync('data'); }
        fsMod.writeFileSync(
            'data/' + filename, JSON.stringify(jsonObj, undefined, 2),
            {encoding: 'utf8'});
      });
});
