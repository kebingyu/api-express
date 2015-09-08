var bcrypt = require('bcrypt');
var tokenModel = require('../models/token');

var userModel = (function() {
    var instance;

    var _db; // mongo connection

    var _col = 'user'; // mongo collection

    function init() {
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
                            .new(doc._id, doc.username, callback);
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
