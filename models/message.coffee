waterline = require 'waterline'

module.exports = waterline.Collection.extend({
    identity: "messages"
    connection: "default"
    attributes:
        message:
            type: "string"
            required: true

        time:
            type: "datetime"
            required: true

        to:
            type: "string"
            required: true

        from:
            type: "string"
            required: true
})

