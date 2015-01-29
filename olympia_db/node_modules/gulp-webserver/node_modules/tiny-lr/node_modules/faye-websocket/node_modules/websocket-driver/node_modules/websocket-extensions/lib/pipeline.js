'use strict';

var bind = function(object, method) {
  return function() {
    return object[method].apply(object, arguments);
  };
};

var Pipeline = function(sessions) {
  var nextIn, nextOut;

  for (var i = 0, n = sessions.length; i < n; i++) {
    nextIn  = new Queue(sessions[i], 'processIncomingMessage', nextIn);
    nextOut = new Queue(sessions[n-1-i], 'processOutgoingMessage', nextOut);
  }
  this._in  = nextIn;
  this._out = nextOut;
};

Pipeline.prototype.processIncomingMessage = function(message, callback, context) {
  if (this._in)
    this._in.push({message: message, callback: callback, context: context});
  else
    callback.call(context, null, message);
};

Pipeline.prototype.processOutgoingMessage = function(message, callback, context) {
  if (this._out)
    this._out.push({message: message, callback: callback, context: context});
  else
    callback.call(context, null, message);
};

var Queue = function(record, method, next) {
  this._ext   = record[0];
  this._fn    = bind(record[1], method);
  this._next  = next;
  this._inbox = [];
};

Queue.prototype.push = function(record) {
  var self = this;

  record.done = false;
  this._inbox.push(record);

  this._fn(record.message, function(error, msg) {
    if (error) {
      error.message = [self._ext.name, error.message].join(': ');
      return record.callback.call(record.context, error, null);
    }

    record.message = msg;
    record.done    = true;

    while (self._inbox.length > 0 && self._inbox[0].done) {
      record = self._inbox.shift();
      if (self._next)
        self._next.push(record);
      else
        record.callback.call(record.context, null, record.message);
    }
  });
};

module.exports = Pipeline;
