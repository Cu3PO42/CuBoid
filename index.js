require('coffee-script/register');
var waterline = require('./waterline-bootstrap'),
    _ = require('lodash');

waterline.orm.initialize(waterline.config, function(err, models) {
    _.extend(waterline.models, models);
    var config = require('./config'),
        local = require('./local');
    _.extend(config, local);
    run(config);
});

function run(config) {
    var Client = require('tennu').Client;
// Create the dependency management object.
    var parts = {};
    var verbose = true, debug = false;
    if (verbose) {
        var log = function (level) {
            return function () {
                var args = Array.prototype.slice.call(arguments).map(function (arg) {
                    if (typeof arg === 'object') {
                        return inspect(arg);
                    } else {
                        return String(arg);
                    }
                });
                console.log(String(Date()), level, args.join(' '));
            };
        };
        parts.Logger = {
            debug: debug ? log('debug') : function () {
            },
            info: log('info'),
            notice: log('notice'),
            warn: log('warn'),
            error: log('error'),
            crit: log('crit'),
            alert: log('alert'),
            emerg: log('emerg')
        };
    }
// Try to connect, or print why it couldn"t.
    try {
        var client = Client(config, parts);
        client.connect();
    } catch (e) {
        console.log('Error occurred creating and connecting to Tennu instance.');
        console.log();
        console.log(e.stack);
        process.exit(4);
    }
// Register hangup functions
    var onabort = function self() {
        if (!self.attemptedToQuitAlready) {
            client.quit('Bot terminated.');
        } else {
            process.exit(1);
        }
    };
    process.on('SIGHUP', onabort);
    process.on('SIGINT', onabort);
    process.on('SIGQUIT', onabort);
    process.on('SIGABRT', onabort);
    process.on('SIGTERM', onabort);
}
