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

(function() {
  var data;
  var currentTable;

  function listContents(table) {
    var contents = data.tables[table];
    if (contents.length == 0) return;

    var columns = Object.keys(contents[0]);
    var el = $('<table></table>');

    var headers = columns.map(function(colName) {
      return '<th>' + colName + '</th>';
    }).join('');
    el.append('<thead><tr>' + headers + '</tr></thead>\n');

    var rows = contents.map(function(row) {
      var displayRow = columns.map(function(colName) {
        return '<td>' + row[colName] + '</td>';
      }).join('');
      return '<tr>' + displayRow + '</tr>';
    }).join('\n');
    el.append('<tbody>' + rows + '</tbody>\n');
    $('#data').append(el);
  }

  function display(data) {
    $('#db_name').text(data.name);
    $('#db_version').text(data.version);
    var tableList = $('#table_list');
    Object.keys(data.tables).sort().forEach(function(table) {
      tableList.append('<li><a href="#">' + table + '</a></li>');
    });
    tableList.children().click(function(e) {
      if (currentTable == e.target.text) return;
      currentTable = e.target.text;
      $('#data').empty();
      listContents(e.target.text);
    });
  }

  function refresh() {
    data = undefined;
    $('#table_list').empty();
    $('#data').empty();
    var evalStatement = 'window[\'#lfExport\']()';
    chrome.devtools.inspectedWindow.eval(
        evalStatement, function(results, exception) {
          if (exception) {
            $('#error_message').text(
                'Cannot find Lovefield database on this page.');
            return;
          }

          try {
            data = JSON.parse(results);
          } catch (e) {
          }
          if (data) {
            display(data);
          } else {
            $('#error_message').text(
                'Cannot inspect database on this page.');
          }
        });
  }

  $(function() {
    $('#refresh').click(refresh);
    refresh();
  });
})();
