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
  var dbList;
  var tableList;
  var currentDb;
  var currentTable;
  var currentPage;
  var evalFn = 'window.top[\'#lfInspect\']';

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

  function listDb() {
    currentDb = null;
    var evalStatement = evalFn + '(null, null);';
    chrome.devtools.inspectedWindow.eval(
        evalStatement,
        function(results, exception) {
          try {
            dbList = JSON.parse(results);
          } catch (e) {
          }

          var dbDropdown = $('#db_name');
          var dbNames = Object.keys(dbList);
          dbNames.forEach(function(name) {
            dbDropdown.append(
                $('<option></option>').attr('value', name).text(name));
          });
          if (dbNames.length) {
            dbDropdown.val(dbNames[0]);
            dbDropdown.change();
          } else {
            $('#error_message').text('Cannot inspect database on this page.');
          }
        });
  }

  function selectDb() {
    var dbName = $('#db_name').val();
    if (dbName == null || dbName.length == 0 || dbName == currentDb) {
      return;
    }

    currentDb = dbName;
    currentTable = null;
    $('#table_list').empty();
    $('#page_list').empty();
    $('#page_count').text('');

    $('#db_version').text = dbList[dbName].toString();
    var evalStatement = evalFn + '("' + currentDb + '", null);';
    chrome.devtools.inspectedWindow.eval(
        evalStatement,
        function(results, exception) {
          try {
            tableList = JSON.parse(results);
          } catch (e) {
          }

          var tableGrid = $('#table_list');
          Object.keys(tableList).sort().forEach(function(table) {
            tableGrid.append('<li><a href="#">' + table + '</a></li>');
          });
          tableGrid.children().click(function(e) {
            if (currentTable == e.target.text) return;
            currentTable = e.target.text;
            $('#data').empty();
            selectTable(e.target.text);
          });
        });
  }

  function selectTable(tableName) {
    $('#data').empty();
    $('#page_list').empty();
    currentPage = 0;

    var rowCount = tableList[tableName];
    if (rowCount == 0) {
      $('#page_count').text('0');
      $('#data').append($('<p></p>').text(tableName + ' has no data.'));
      return;
    }

    var pageCount = Math.ceil(rowCount / 50);
    $('#page_count').text(pageCount.toString());

    var pageList = $('#page_list');
    for (var i = 1; i <= pageCount; ++i) {
      pageList.append(
          $('<option></option>').attr('value', i).text(i.toString()));
    }
    pageList.val(1);
    pageList.change();
  }

  function updatePage() {
    var page = $('#page_list').val();
    if (page == currentPage) return;

    $('#data').empty();
    currentPage = page;
    var evalStatement = evalFn + '("' + currentDb + '", "' + currentTable +
        '", 50, ' + ((currentPage - 1) * 50).toString() + ');';
    chrome.devtools.inspectedWindow.eval(
        evalStatement,
        function(results, exception) {
          var contents = [];
          try {
            contents = JSON.parse(results);
          } catch (e) {
          }
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
        });
  }

  function refresh() {
    data = undefined;
    $('#table_list').empty();
    $('#data').empty();
    $('#db_name').empty();
    listDb();
  }

  $(function() {
    $('#refresh').click(refresh);
    $('#db_name').change(selectDb);
    $('#page_list').change(updatePage);
    refresh();
  });
})();
