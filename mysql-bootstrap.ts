/// <reference path="typings/mysql/mysql.d.ts" />
/// <reference path="./typings/bluebird/bluebird.d.ts" />

import mysql = require("mysql");
import Promise = require("bluebird");

var Pool = require("mysql/lib/Pool").prototype;

Promise.promisifyAll(Pool);
Promise.promisifyAll(require("mysql/lib/Connection").prototype);

Pool.execSql = (sql: string, replacement: any[]) => {
    this.getConnectionAsync()
    .then((connection) => {
        return connection.queryAsync(sql, replacement)
        .then((results) => {
            connection.release();
            return results[0];
        });
    });
}

export = mysql;
