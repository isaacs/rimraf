var rimraf = require("../rimraf-streamline")
  , path = require("path")
rimraf(path.join(__dirname, "target"), null, function (er) {
  if (er) throw er
})

