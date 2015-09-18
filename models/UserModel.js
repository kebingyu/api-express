var util     = require('util'), 
    event    = require('events'), 
    bcrypt   = require('bcrypt'), 
    md5      = require('md5'), 
    objectId = require('mongodb').ObjectID;

function UserModel(db, emitter) {
    this._db = db; // mongo connection

    this._col = 'user'; // mongo collection

    this._ttl = 1800000; // token TTL in milliseconds (30 mins)

    // Instance to publish and subscribe the events
    this._emitter = emitter ? emitter : this;

    event.EventEmitter.call(this);
}

util.inherits(UserModel, event.EventEmitter);

UserModel.prototype.toDate = function(timestamp) {
    var t = new Date(timestamp);
    return (t.getMonth() + 1) + '/' + t.getDate() + '/' + t.getFullYear()
    + ', ' + t.getHours() + ' : ' + t.getMinutes();
};

// convert to front-end readable format
UserModel.prototype.toAngularFormat = function(data) {
    data.id = data._id.toString(); 
    var date = this.toDate(data.created_at);
    data.created_at = {date: date};
};

UserModel.prototype.isExpired = function(data, currTime) {
    return data.updated_at + this._ttl < currTime;
};

UserModel.prototype.refreshToken = function(doc) {
    var currTime = Date.now(),
        token = md5(currTime),
        self = this;

    self._db.get(self._col)
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
            self._emitter.emit('error.database', {error : [err.$err]});
        } else if (result.writeConcernError || result.writeError) {
            self._emitter.emit('error.database', {error : ['Internal error.']});
        } else {
            if (result > 0) {
                self._emitter.emit('done', {
                    success : {
                        user_id  : doc._id.toString(),
                        username : doc.username,
                        token    : token
                    }
                });
            } else {
                self._emitter.emit('error.validation', {error : ['User not found.']});
            }
        }
    });
};

UserModel.prototype.login = function(data) {
    var self = this;

    self._db.get(self._col)
    .findOne({username : data.username})
    .on('complete', function (err, doc) {
        if (err) {
            self._emitter.emit('error.database', {error : [err.$err]});
        } else if (doc) {
            if (bcrypt.compareSync(data.password, doc.password)) {
                if (doc.access_token.value && !self.isExpired(doc.access_token, Date.now())) {
                    // return the existing token
                    self._emitter.emit('done', {
                        success : {
                            user_id  : doc.user_id.toString(),
                            username : doc.username,
                            token    : doc.access_token.value
                        }
                    });
                } else { // let's refresh access token
                    self.refreshToken(doc);
                }
            } else {
                self._emitter.emit('error.validation', {error : ['Please re-enter your password.']});
            }
        } else {
            self._emitter.emit('error.validation', {error : ['Please re-enter your password.']});
        }
    });
};

UserModel.prototype.logout = function(data, callback) {
    var self = this;

    self._db.get(self._col)
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
            self._emitter.emit('error.database', {error : [err.$err]});
        } else if (result.writeConcernError || result.writeError) {
            self._emitter.emit('error.database', {error : ['Internal error.']});
        } else {
            if (result > 0) {
                self._emitter.emit('done', {success : {loggedout : true}});
            } else {
                self._emitter.emit('error.validation', {error : ['Invalid access token.']});
            }
        }
    });
};

UserModel.prototype.usernameExists = function(username) {
    var self = this;
    self._db.get(self._col)
    .findOne({username : username})
    .on('complete', function (err, doc) {
        if (err) {
            self._emitter.emit('error.database', {error : [err.$err]});
        } else if (doc) {
            self._emitter.emit('error.validation', {error : ['This user name has already been taken.']});
        } else {
            self._emitter.emit('usernameNotExists');
        }
    });
};

UserModel.prototype.emailExists = function(email) {
    var self = this;
    self._db.get(self._col)
    .findOne({email : email})
    .on('complete', function (err, doc) {
        if (err) {
            self._emitter.emit('error.database', {error : [err.$err]});
        } else if (doc) {
            self._emitter.emit('error.validation', {error : ['This email address has already been taken.']});
        } else {
            self._emitter.emit('emailNotExists');
        }
    });
};

/**
 * Register new user  
 */
UserModel.prototype.new = function(data) {
    var self = this;

    // validate uniqueness of "username"
    self.usernameExists(data.username);

    self
    .on('usernameNotExists', function() {
        // validate uniqueness of "email"
        self.emailExists(data.email);
    })
    .on('emailNotExists', function() {
        // create new user
        var now = Date.now();
        self._db.get(self._col)
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
                self._emitter.emit('error.database', {error : [err.$err]});
            } else if (doc) {
                self._emitter.emit('done', {
                    success : {
                        'username'   : doc.username,
                        'created_at' : doc.created_at
                    }
                });
            } else {
                self._emitter.emit('error.database', {error : ['Internal error.']});
            }
        });
    });
};

/**
 * Read user profile by id  
 */
UserModel.prototype.read = function(data) {
    var self = this;

    self._db.get(self._col)
    .findOne({_id : objectId(data.user_id)})
    .on('complete', function (err, doc) {
        if (err) {
            self._emitter.emit('error.database', {error : [err.$err]});
        } else if (doc) {
            self.toAngularFormat(doc);
            self._emitter.emit('done', {success : doc});
        } else {
            self._emitter.emit('error.validation', {error : ['User not found.']});
        }
    });
};

/**
 * Update user profile  
 * currently only email can be updated
 */
UserModel.prototype.update = function(data) {
    var self = this;

    self.emailExists(data.email);

    self.on('emailNotExists', function() {
        var currTime = Date.now();
        self._db.get(self._col)
        .update(
            {_id : objectId(data.user_id)},
            {$set : {
                email      : data.email,
                updated_at : currTime
            }}
        )
        .on('complete', function(err, result) {
            if (err) {
                self._emitter.emit('error.database', {error : [err.$err]});
            } else if (result.writeConcernError || result.writeError) {
                self._emitter.emit('error.database', {error : ['Internal error.']});
            } else {
                if (result > 0) {
                    self._emitter.emit('done', {
                        success : {
                            username   : data.username,
                            updated_at : currTime
                        }
                    });
                } else {
                    self._emitter.emit('error.validation', {error : ['User not found.']});
                }
            }
        });
    });
};

/**
 * Validate if access token is expired  
 */
UserModel.prototype.expired = function(data) {
    var self = this;

    self._db.get(self._col)
    .findOne({_id : objectId(data.user_id)})
    .on('complete', function(err, doc) {
        if (err) {
            self._emitter.emit('error.database', {error : [err.$err]});
        } else if (doc.access_token.value == data.token) {
            if (self.isExpired(doc.access_token, Date.now())) {
                self._emitter.emit('error.validation', {error : ['Access token expired.']});
            } else {
                self._emitter.emit('allowAccess');
            }
        } else {
            self._emitter.emit('error.validation', {error : ['Invalid access token.']});
        }
    });
};

module.exports = UserModel;
