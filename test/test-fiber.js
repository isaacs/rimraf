var rimraf
  , path = require("path")

try {
  rimraf = require("../fiber")
} catch (er) {
  console.error("skipping fiber test")
}

if (rimraf) rimraf(path.join(__dirname, "target"))

