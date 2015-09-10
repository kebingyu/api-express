var md5 = require('md5');
var objectId = require('mongodb').ObjectID;

var tokenModel = (function() {
    var instance;

    var _db; // mongo connection

    var _col = 'access_token'; // mongo collection

    var _ttl = 1800000; // token TTL in milliseconds (30 mins)

    function init() {
        function isExpired(doc, currTime) {
            return doc.updated_at + _ttl < currTime;
        }

        return {
            db : function(db) {
                _db = db;
                return this;
            },
            new : function(user_id, username, callback) {
                _db.get(_col)
                .findOne({user_id : user_id})
                .on('complete', function(err, doc) {
                    if (err) {
                        return callback({error : [err.$err]});
                    } else if (doc) { // found an existing access token record
                        var currTime = Date.now();
                        if (isExpired(doc, currTime)) { // update the token if expired
                            _db.get(_col)
                            .findAndModify({
                                query : {user_id : user_id},
                                update : {
                                    token : md5(currTime),
                                    updated_at : currTime
                                },
                                new : true
                            })
                            .on('complete', function(err, doc) {
                                if (err) {
                                    return callback({error : [err.$err]});
                                } else {
                                    return callback({
                                        success : {
                                            user_id : doc.user_id,
                                            username : username,
                                            token : doc.token
                                        }
                                    });
                                }
                            });
                        } else { // return the existing token
                            return callback({
                                success : {
                                    user_id : doc.user_id,
                                    username : username,
                                    token : doc.token
                                }
                            });
                        }
                    } else { // let's create a new access token
                        var currTime = Date.now();
                        _db.get(_col)
                        .insert({
                            user_id : user_id,
                            token : md5(currTime),
                            updated_at : currTime
                        })
                        .on('complete', function(err, doc) {
                            if (err) {
                                return callback({error : [err.$err]});
                            } else {
                                return callback({
                                    success : {
                                        user_id : doc.user_id,
                                        username : username,
                                        token : doc.token
                                    }
                                });
                            }
                        });
                    }
                });
            },
            remove : function(data, callback) {
                _db.get(_col)
                .remove({
                    user_id : data.user_id,
                    token : data.token
                })
                .on('complete', function(err) {
                    if (err) {
                        return callback({error : [err.$err]});
                    } else {
                        return callback({success : {loggedout : true}});
                    }
                });
            },
            expired : function(data, callback) {
                _db.get(_col)
                .findOne({user_id : data.user_id})
                .on('complete', function(err, doc) {
                    if (err) {
                        return callback({error : [err.$err]});
                    } else if (doc.token == data.token) {
                        return callback({success : isExpired(doc, Date.now())});
                    } else {
                        return callback({error : ['Invalid access token.']});
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

module.exports = tokenModel;
