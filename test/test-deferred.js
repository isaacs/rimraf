var rimraf
  , path = require("path")

try {
  rimraf = require("../deferred")
} catch (er) {
  console.error("skipping deferred test")
}

if (rimraf) {
  rimraf(path.join(__dirname, "target")).end();
}
