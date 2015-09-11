var tokenModel = require('../models/token');
var objectId = require('mongodb').ObjectID;

var blogModel = (function() {
    var instance;

    var _db; // mongo connection

    var _col = 'blog'; // mongo collection

    function init() {
        function toDate(timestamp) {
            var t = new Date(timestamp);
            return (t.getMonth() + 1) + '/' + t.getDate() + '/' + t.getFullYear()
            + ', ' + t.getHours() + ' : ' + t.getMinutes();
        }

        // convert to front-end readable format
        function toAngularFormat(data) {
            data.id         = data._id.toString();
            data.created_at = toDate(data.created_at);
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
                        user_id    : data.user_id,
                        title      : data.title,
                        content    : data.content,
                        created_at : now,
                        updated_at : now
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
            },
            /**
             * Read blog by blog id
             *
             * params : request params
             * query  : request query
             */
            read : function(params, query, callback) {
                _db.get(_col)
                    .findOne({
                        _id     : objectId(params.blog_id),
                        user_id : query.user_id
                    })
                    .on('complete', function (err, doc) {
                        if (err) {
                            return callback({error : [err.$err]});
                        } else if (doc) {
                            toAngularFormat(doc);
                            return callback({success : doc});
                        } else {
                            return callback({error : ['Blog not found.']});
                        }
                    });
            },
            // read all blogs for given user id
            readAll : function(data, callback) {
                _db.get(_col)
                    .find({user_id : data.user_id})
                    .on('complete', function (err, doc) {
                        if (err) {
                            return callback({error : [err.$err]});
                        } else if (doc) {
                            var blogs = [];
                            for (var i = 0, j = doc.length; i < j; i++) {
                                toAngularFormat(doc[i]);
                                blogs.push(doc[i]);
                            }
                            return callback({success : blogs});
                        } else {
                            return callback({error : ['Blog not found.']});
                        }
                    });
            },
            /**
             * Update a blog
             *
             * params : request params
             * body   : request body
             */
            update : function(params, body, callback) {
                var now = Date.now(),
                    $update = {
                        updated_at : now
                    };
                if (body.title) {
                    $update.title = body.title;
                }
                if (body.content) {
                    $update.content = body.content;
                }

                _db.get(_col)
                .update(
                    {_id : objectId(params.blog_id)},
                    {$set : $update}
                )
                .on('complete', function(err, result) {
                    if (err) {
                        return callback({error : [err.$err]});
                    } else if (result.writeConcernError || result.writeError) {
                        return callback({error : ['Internal error.']});
                    } else {
                        if (result > 0) {
                            return callback({
                                success : {
                                    'id'         : params.blog_id,
                                    'updated_at' : now
                                }
                            });
                        } else {
                            return callback({error : ['Blog not found.']});
                        }
                    }
                });
            },
            /**
             * Delete blog by blog id
             *
             * params : request params
             * query  : request query
             */
            delete : function(params, query, callback) {
                _db.get(_col)
                    .remove(
                        {
                            _id     : objectId(params.blog_id),
                            user_id : query.user_id
                        },
                        {
                            justOne : true
                        }
                    )
                    .on('complete', function (err, result) {
                        if (err) {
                            return callback({error : [err.$err]});
                        } else {
                            if (result > 0) {
                                return callback({success : [true]});
                            } else {
                                return callback({error : ['Blog not found.']});
                            }
                        }
                    });
            },
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

module.exports = blogModel;
