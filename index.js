var fs = require('fs');

module.exports = FSMonitor;

function FSMonitor() {
  this.stack = [];
  this.state = 'idle';
  this.stats = [];
}


FSMonitor.prototype._start = function() {
  this.state = 'active';
  this._attach();
};

FSMonitor.prototype._stop = function() {
  this.state = 'idle';
  this._detach();
};

FSMonitor.prototype.shouldMeasure = function() {
  return this.state === 'active';
};

FSMonitor.prototype.push = function(node) {
  this.stack.push(node);

  if (this.length === 1) {
    this._start();
  }
};

FSMonitor.prototype.statsFor = function(node) {
  var id = node.id;

  if (this.stats.length <= id) {
    return null;
  } else {
    return this.stats[id];
  }
};

FSMonitor.prototype.totalStats = function() {
  var result = Object.create(null);

  this.stats.forEach(function(stat) {
    Object.keys(stat).forEach(function(key) {
      result[key] = (result[key] || 0);
      result[key] += (stat[key] || 0);
    });
  });

  return result;
};

FSMonitor.prototype._measure = function(name) {
  if (this.state !== 'active') {
    throw new Error('Cannot measure if the monitor is not active');
  }
  var id = this.top.id;

  if (typeof id !== 'number') {
    throw new Error('EWUT: encountered unexpected node without an id....');
  }
  var metrics = this.stats[id] = this.stats[id] || Object.create(null);
  metrics[name] = metrics[name] || 0;
  metrics[name]++;
};

FSMonitor.prototype._attach = function() {
  var monitor = this;

  for (var member in fs) {
    var old = fs[member];
    if (typeof old === 'function') {
      fs[member] = (function(old, member) {
        return function() {
          if (monitor.shouldMeasure()) {
            monitor._measure(member);
          }
          return old.apply(fs, arguments);
        };
      }(old, member));

      fs[member].__restore = function() {
        fs[member] = old;
      };
    }
  }
};

FSMonitor.prototype._detach = function() {
  for (var member in fs) {
    if (typeof old === 'function') {
      fs[member].__restore();
    }
  }
};

FSMonitor.prototype.reset = function() {
  this.stats.length = 0;
};

FSMonitor.prototype.pop = function(node) {
  this.stack.pop();

  if (this.length === 0) {
    this._stop();
  }
};

Object.defineProperty(FSMonitor.prototype, 'length', {
  get: function() {
    return this.stack.length;
  }
});

Object.defineProperty(FSMonitor.prototype, 'top', {
  get: function() {
    return this.stack[this.stack.length - 1];
  }
});

