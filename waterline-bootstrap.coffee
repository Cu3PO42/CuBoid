Waterline = require 'waterline'
memory = require 'sails-memory'

config =
    adapters:
        memory: memory

    connections:
        default:
            adapter: "memory"

orm = new Waterline()

orm.loadCollection(require('./models/message'))

module.exports = orm: orm, config: config, models: {}