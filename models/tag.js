var objectId = require('mongodb').ObjectID;

var tagModel = (function() {
    var instance;

    var _db; // mongo connection

    var _col = 'tag'; // mongo collection

    function init() {
        // convert to front-end readable format
        function toAngularFormat(data) {
            data.id = data._id.toString();
        }

        return {
            db : function(db) {
                _db = db;
                return this;
            },
            new : function(data, callback) {
                var now = Date.now();
                _db.get(_col)
                    .insert({
                        user_id    : objectId(data.user_id),
                        title      : data.title,
                        content    : data.content,
                        created_at : now,
                        updated_at : now,
                        tags       : []
                    })
                    .on('complete', function(err, doc) {
                        if (err) {
                            return callback({error : [err.$err]});
                        } else {
                            return callback({
                                success : {
                                    'id'         : doc._id.toString(),
                                    'created_at' : doc.created_at
                                }
                            });
                        }
                    });
            }
        }
    }

    return {
        getInstance : function() {
            if (!instance) {
                instance = init();
            }
            return instance;
        }
    }

})();

module.exports = tagModel;
