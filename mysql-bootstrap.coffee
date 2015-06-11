mysql = require 'mysql'
Promise = require 'bluebird'

pool = require('mysql/lib/Pool').prototype
Promise.promisifyAll(pool)
Promise.promisifyAll(require('mysql/lib/Connection').prototype)

pool.execSql = (sql, replacement) ->
    @getConnectionAsync()
    .then (connection) ->
        [connection, connection.queryAsync(sql, replacement)]
    .spread (connection, rows) ->
        connection.release()
        rows[0]

module.exports = mysql
