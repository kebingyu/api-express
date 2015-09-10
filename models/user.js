var bcrypt = require('bcrypt');
var tokenModel = require('../models/token');
var objectId = require('mongodb').ObjectID;

var userModel = (function() {
    var instance;

    var _db; // mongo connection

    var _col = 'user'; // mongo collection

    function init() {
        function toDate(timestamp) {
            var t = new Date(timestamp);
            return (t.getMonth() + 1) + '/' + t.getDate() + '/' + t.getFullYear()
            + ', ' + t.getHours() + ' : ' + t.getMinutes();
        }

        return {
            db : function(db) {
                _db = db;
                return this;
            },
            new : function(data, callback) {
                // validate uniqueness of "username"
                _db.get(_col)
                .findOne({username : data.username})
                .on('complete', function (err, doc) {
                    if (err) {
                        return callback({error : [err.$err]});
                    } else if (doc) {
                        return callback({error : ['This user name has already been taken.']});
                    } else {
                        // validate uniqueness of "email"
                        _db.get(_col)
                        .findOne({email : data.email})
                        .on('complete', function (err, doc) {
                            if (err) {
                                return callback({error : [err.$err]});
                            } else if (doc) {
                                return callback({error : ['This email address has already been taken.']});
                            } else {
                                // create new user
                                var now = Date.now();
                                _db.get(_col)
                                .insert({
                                    username : data.username,
                                    email : data.email,
                                    password : bcrypt.hashSync(data.password, bcrypt.genSaltSync(10)),
                                    created_at : now,
                                    updated_at : now
                                })
                                .on('complete', function(err, doc) {
                                    if (err) {
                                        return callback({error : [err.$err]});
                                    } else {
                                        return callback({
                                            success : {
                                                'username' : doc.username,
                                                'created_at' : doc.created_at
                                            }
                                        });
                                    }
                                }); // end of insert
                            }
                        }); // end of validate email
                    }
                }); // end of validate username
            },
            read : function(data, callback) {
                _db.get(_col)
                    .findOne({_id : objectId(data.user_id)})
                    .on('complete', function (err, doc) {
                        if (err) {
                            return callback({error : [err.$err]});
                        } else if (doc) {
                            var date = toDate(doc.created_at);
                            doc.created_at = {date: date};
                            return callback({success : doc});
                        } else {
                            return callback({error : ['User not found.']});
                        }
                    });
            },
            // currently only email can be updated
            update : function(data, callback) {
                _db.get(_col)
                    .findOne({email : data.email})
                    .on('complete', function (err, doc) {
                        if (err) {
                            return callback({error : [err.$err]});
                        } else if (doc) {
                            return callback({error : ['This email address has already been taken.']});
                        } else { // this email is not taken
                            var currTime = Date.now();
                            _db.get(_col)
                                .update(
                                    {_id : objectId(data.user_id)},
                                    {$set : {
                                        email : data.email,
                                        updated_at : currTime
                                    }}
                                )
                                .on('complete', function(err, result) {
                                    if (err) {
                                        return callback({error : [err.$err]});
                                    } else if (result.writeConcernError || result.writeError) {
                                        return callback({error : ['Internal error.']});
                                    } else if (result.writeConcernError || result.writeError) {
                                    } else {
                                        return callback({
                                            success : {
                                                username : data.username,
                                                updated_at : currTime
                                            }
                                        });
                                    }
                                });
                        }
                    });
            },
            login : function(data, callback) {
                _db.get(_col)
                .findOne({username : data.username})
                .on('complete', function (err, doc) {
                    if (err) {
                        return callback({error : [err.$err]});
                    } else if (doc) {
                        if (bcrypt.compareSync(data.password, doc.password)) {
                            // try to get access token and login
                            tokenModel.getInstance()
                            .db(_db)
                            .new(doc._id.toString(), doc.username, callback);
                        } else {
                            return callback({error : ['Please re-enter your password.']});
                        }
                    } else {
                        return callback({error : ['Please re-enter your password.']});
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

module.exports = userModel;
