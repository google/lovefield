'use strict';

var StreamReader = function() {
  this._queue     = [];
  this._queueSize = 0;
  this._cursor    = 0;
};

StreamReader.prototype.put = function(buffer) {
  if (!buffer || buffer.length === 0) return;
  if (!buffer.copy) buffer = new Buffer(buffer);
  this._queue.push(buffer);
  this._queueSize += buffer.length;
};

StreamReader.prototype.read = function(length) {
  if (length > this._queueSize) return null;

  var buffer = new Buffer(length),
      queue  = this._queue,
      remain = length,
      n      = queue.length,
      i      = 0,
      chunk, size;

  while (remain > 0 && i < n) {
    chunk = queue[i];
    size  = Math.min(remain, chunk.length - this._cursor);

    chunk.copy(buffer, length - remain, this._cursor, this._cursor + size);

    remain          -= size;
    this._queueSize -= size;
    this._cursor     = (this._cursor + size) % chunk.length;

    i += 1;
  }

  queue.splice(0, this._cursor === 0 ? i : i - 1);

  return buffer;
};

module.exports = StreamReader;
