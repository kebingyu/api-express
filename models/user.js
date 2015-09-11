var bcrypt = require('bcrypt');
var md5 = require('md5');
var objectId = require('mongodb').ObjectID;

var userModel = (function() {
    var instance;

    var _db; // mongo connection

    var _col = 'user'; // mongo collection

    var _ttl = 1800000; // token TTL in milliseconds (30 mins)

    function init() {
        function toDate(timestamp) {
            var t = new Date(timestamp);
            return (t.getMonth() + 1) + '/' + t.getDate() + '/' + t.getFullYear()
            + ', ' + t.getHours() + ' : ' + t.getMinutes();
        }

        // convert to front-end readable format
        function toAngularFormat(data) {
            data.id = data._id.toString(); 
            var date = toDate(data.created_at);
            data.created_at = {date: date};
        }

        // check if access token is expired
        function isExpired(data, currTime) {
            return data.updated_at + _ttl < currTime;
        }

        function refreshToken(doc, callback) {
            var currTime = Date.now(),
                token = md5(currTime);
            _db.get(_col)
            .update(
                {_id : doc._id},
                {$set : {
                    access_token : {
                        value : token,
                        updated_at : currTime
                    }
                }}
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
                                user_id  : doc._id.toString(),
                                username : doc.username,
                                token    : token
                            }
                        });
                    } else {
                        return callback({error : ['User not found.']});
                    }
                }
            });
        }

        return {
            db : function(db) {
                _db = db;
                return this;
            },
            /**
             * Register new user  
             */
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
                                    username   : data.username,
                                    email      : data.email,
                                    password   : bcrypt.hashSync(data.password, bcrypt.genSaltSync(10)),
                                    created_at : now,
                                    updated_at : now,
                                    access_token : {
                                        value : '',
                                        updated_at : ''
                                    }
                                })
                                .on('complete', function(err, doc) {
                                    if (err) {
                                        return callback({error : [err.$err]});
                                    } else {
                                        return callback({
                                            success : {
                                                'username'   : doc.username,
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
            /**
             * Read user profile by id  
             */
            read : function(data, callback) {
                _db.get(_col)
                    .findOne({_id : objectId(data.user_id)})
                    .on('complete', function (err, doc) {
                        if (err) {
                            return callback({error : [err.$err]});
                        } else if (doc) {
                            toAngularFormat(doc)
                            return callback({success : doc});
                        } else {
                            return callback({error : ['User not found.']});
                        }
                    });
            },
            /**
             * Update user profile  
             * currently only email can be updated
             */
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
                                        email      : data.email,
                                        updated_at : currTime
                                    }}
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
                                                    username   : data.username,
                                                    updated_at : currTime
                                                }
                                            });
                                        } else {
                                            return callback({error : ['User not found.']});
                                        }
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
                            if (doc.access_token.value && !isExpired(doc.access_token, Date.now())) {
                                // return the existing token
                                return callback({
                                    success : {
                                        user_id  : doc.user_id.toString(),
                                        username : doc.username,
                                        token    : doc.access_token.value
                                    }
                                });
                            } else { // let's refresh access token
                                refreshToken(doc, callback);
                            }
                        } else {
                            return callback({error : ['Please re-enter your password.']});
                        }
                    } else {
                        return callback({error : ['Please re-enter your password.']});
                    }
                });
            },
            logout : function(data, callback) {
                _db.get(_col)
                .update(
                    {
                        _id : objectId(data.user_id),
                        "access_token.value" : data.token
                    },
                    {$set : {
                        access_token : {
                            value : '',
                            updated_at : ''
                        }
                    }}
                )
                .on('complete', function(err, result) {
                    if (err) {
                        return callback({error : [err.$err]});
                    } else if (result.writeConcernError || result.writeError) {
                        return callback({error : ['Internal error.']});
                    } else {
                        if (result > 0) {
                            return callback({success : {loggedout : true}});
                        } else {
                            return callback({error : ['Invalid access token.']});
                        }
                    }
                });
            },
            /**
             * Validate if access token is expired  
             */
            expired : function(data, callback) {
                _db.get(_col)
                .findOne({_id : objectId(data.user_id)})
                .on('complete', function(err, doc) {
                    if (err) {
                        return callback({error : [err.$err]});
                    } else if (doc.access_token.value == data.token) {
                        return callback({success : isExpired(doc.access_token, Date.now())});
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

module.exports = userModel;
