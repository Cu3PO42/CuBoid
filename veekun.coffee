mysql = require 'mysql'
Promise = require 'bluebird'

Promise.promisifyAll(require('mysql/lib/Pool').prototype)
Promise.promisifyAll(require('mysql/lib/Connection').prototype)

pool = mysql.createPool
    connectionLimit: 10
    host: '127.0.0.1'
    user: 'pokedex'
    password: ''
    database: 'pokedex'
    debug: false

module.exports = pool