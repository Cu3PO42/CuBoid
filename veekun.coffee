sql = require 'sqlite3'
Promise = require 'bluebird'

db = new sql.Database("./pokedex.sqlite", sql.OPEN_READONLY)
Promise.promisifyAll(db)

module.exports = db