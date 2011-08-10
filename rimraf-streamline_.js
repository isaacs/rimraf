//streamline.options = { "callback" : "wait" }
var path = require('path'),
fs = require('fs');

var timeout = 0;
var rimraf = module.exports = function(p, opts, wait) {
  opts = opts || {};
  opts.maxBusyTries = opts.maxBusyTries || 3;
  var busyTries = 0;
  
  while (true) {
    try {
      var stat = fs.lstat(p, wait), g;
      // check to make sure that symlinks are ours.
      if ((g = opts.gently) && 
	    path.resolve(stat.isSymbolicLink() ? path.dirname(fs.readlink(p, wait)) : p).indexOf(g) !== 0) {
        var er = new Error("Refusing to delete: " + p + " not in " + g);
        er.errno = require("constants").EEXIST;
        er.code = "EEXIST";
        er.path = p;
        throw er;
      }
      if (!stat.isDirectory()) return fs.unlink(p, wait);
      var rimrafs = fs.readdir(p, wait).map(function(file) {
        return rimraf(path.join(p, file), opts);
      });
      for (var i = 0; i < rimrafs.length; i++) 
        rimrafs[i](wait);
      fs.rmdir(p, wait);
      timeout = 0;
      return;
    } catch (ex) {
      if (ex.message.match(/^EMFILE/)) {
        setTimeout(wait, timeout += 10);
      } else if (ex.message.match(/^EBUSY/) && busyTries < opt.maxBusyTries) {
        setTimeout(wait, ++busyTries * 100);
      } else if (ex.message.match(/^ENOENT/)) {
        return;
      } else {
        throw ex;
      }
    }
  }
};
