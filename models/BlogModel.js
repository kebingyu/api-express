var util     = require('util'), 
    event    = require('events'), 
    objectId = require('mongodb').ObjectID;

function BlogModel(db) {
    this._db = db; // mongo connection

    this._col = 'blog'; // mongo collection

    event.EventEmitter.call(this);
}

util.inherits(BlogModel, event.EventEmitter);

/**
 * Create a new blog
 *
 * data : post request body
 */
BlogModel.prototype.new = function(data) {
    var self = this;

    var now = Date.now();
    self._db.get(self._col)
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
            self.emit('error.database', {error : [err.$err]});
        } else {
            self.emit('done', {
                success : {
                    'id'         : doc._id.toString(),
                    'created_at' : doc.created_at
                }
            });
        }
    });
};

/**
 * Read blog by blog id
 *
 * params : request params
 * query  : request query
 */
BlogModel.prototype.read = function(params, query) {
    var self = this;
    
    self.findById(params.blog_id, query.user_id);

    self.on('done.findById', function(doc) {
        self.emit('done', {success : doc});
    });
};

BlogModel.prototype.findById = function(blog_id, user_id) {
    var self = this;

    self._db.get(self._col)
    .findOne({
        _id     : objectId(blog_id),
        user_id : objectId(user_id)
    })
    .on('complete', function (err, doc) {
        if (err) {
            self.emit('error.database', {error : [err.$err]});
        } else if (doc) {
            self.toAngularFormat(doc);
            self.emit('done.findById', doc);
        } else {
            self.emit('error.validation', {error : ['Blog not found.']});
        }
    });
};

// read all blogs for given user id
BlogModel.prototype.readAll = function(data) {
    var self = this;

    if (data.tag) { // view by tag
        var TagModel = require('../models/TagModel');
        var tag = new TagModel(self._db);
        tag.getBlogsByTagContent(data, self);

        self
        .on('done.getBlogsByTagContent', function(doc) {
            self.readAllByIds(doc.blogs);
        })
        .on('done.readAllByIds', function(doc) {
            self.emit('done', {success : doc});
        });
    } else { // view all
        self._db.get(self._col)
        .find({user_id : objectId(data.user_id)})
        .on('complete', function (err, doc) {
            if (err) {
                self.emit('error.database', {error : [err.$err]});
            } else if (doc) {
                for (var i = 0, j = doc.length; i < j; i++) {
                    self.toAngularFormat(doc[i]);
                }
                self.emit('done', {success : doc});
            } else {
                self.emit('error.validation', {error : ['Blog not found.']});
            }
        });
    }
};

/**
 * Update a blog
 *
 * params : request params
 * body   : request body
 */
BlogModel.prototype.update = function(params, body) {
    var now = Date.now(),
    $update = {
        updated_at : now
    },
    self = this;

    if (body.title) {
        $update.title = body.title;
    }
    if (body.content) {
        $update.content = body.content;
    }

    self._db.get(self._col)
    .update(
        {_id : objectId(params.blog_id)},
        {$set : $update}
    )
    .on('complete', function(err, result) {
        if (err) {
            self.emit('error.database', {error : [err.$err]});
        } else if (result.writeConcernError || result.writeError) {
            self.emit('error.database', {error : ['Internal error.']});
        } else {
            if (result > 0) {
                self.emit('done', {
                    success : {
                        'id'         : params.blog_id,
                        'updated_at' : now
                    }
                });
            } else {
                self.emit('error.validation', {error : ['Blog not found.']});
            }
        }
    });
};

/**
 * Delete blog by blog id, also update the embedded
 * relationship array
 *
 * params : request params
 * query  : request query
 */
BlogModel.prototype.delete = function(params, query) {
    var self = this;

    self.findById(params.blog_id, query.user_id);

    self
    .on('done.findById', function(doc) {
        // Delete this blog document
        self._db.get(self._col)
        .remove(
            { _id     : doc._id },
            { justOne : true }
        )
        .on('complete', function (err, result) {
            if (err) {
                self.emit('error.database', {error : [err.$err]});
            } else if (result > 0) {
                var tags = doc.tags.map(function(t) {return t.id});
                if (tags.length > 0) {
                    // If the blog contains any tags,
                    // update the relationship as well
                    var TagModel = require('../models/TagModel');
                    var tag = new TagModel(self._db);
                    tag.deleteBlog(tags, doc._id.toString(), self);
                } else {
                    // This blog owns no tag.
                    self.emit('done', {success : [true]});
                }
            } else {
                self.emit('error.validation', {error : ['Blog not found.']});
            }
        });
    })
    .on('done.deleteBlog', function(tags) {
        var TagModel = require('../models/TagModel');
        var tag = new TagModel(self._db);
        tag.removeOrphanTags(tags, self);
    })
    .on('done.removeOrphanTags', function(response) {
        self.emit('done', response);
    });
};


/**
 * Add tag to given blog
 *
 * tag : tag document
 * emitter : instance emits message
 */
BlogModel.prototype.addTag = function(blog_id, tag, emitter) {
    var self = this;

    self._db.get(self._col)
    .update(
        {_id : objectId(blog_id)},
        {$push : {
            tags: {
                id : tag._id,
                content : tag.content
            }
        }}
    )
    .on('complete', function(err, result) {
        if (err) {
            emitter.emit('error.database', {error : [err.$err]});
        } else if (result.writeConcernError || result.writeError) {
            emitter.emit('error.database', {error : ['Internal error.']});
        } else if (result > 0) {
            emitter.emit('done', {
                success : {
                    id : tag._id.toString(),
                    content : tag.content
                }
            });
        } else {
            emitter.emit('error.validation', {error : ['Blog not found.']});
        }
    });
};

/**
 * Delete tag from blog's tags array  
 *
 * emitter : instance emits message
 */
BlogModel.prototype.deleteTag = function(tag_id, data, emitter) {
    var self = this;

    self._db.get(self._col)
    .update(
        {
            _id     : objectId(data.blog_id),
            user_id : objectId(data.user_id)
        },
        {$pull : {
            tags: {
                id : objectId(tag_id)
            }
        }}
    )
    .on('complete', function(err, result) {
        if (err) {
            emitter.emit('error.database', {error : [err.$err]});
        } else if (result.writeConcernError || result.writeError) {
            emitter.emit('error.database', {error : ['Internal error.']});
        } else {
            if (result > 0) {
                emitter.emit('done', {success : [true]});
            } else {
                emitter.emit('done', {success : [false]});
            }
        }
    });
};

// convert to front-end readable format
BlogModel.prototype.toAngularFormat = function(data) {
    data.id         = data._id.toString();
    data.created_at = this.toDate(data.created_at);
};

BlogModel.prototype.toDate = function(timestamp) {
    var t = new Date(timestamp);
    return (t.getMonth() + 1) + '/' + t.getDate() + '/' + t.getFullYear()
    + ', ' + t.getHours() + ' : ' + t.getMinutes();
};

/**
 * Find all blogs with given array of objectId ids  
 */
BlogModel.prototype.readAllByIds = function(ids) {
    var self = this;

    self._db.get(self._col)
    .find({ _id : {$in : ids}} )
    .on('complete', function (err, doc) {
        if (err) {
            self.emit('error.database', {error : [err.$err]});
        } else if (doc.length > 0) {
            for (var i = 0, j = doc.length; i < j; i++) {
                self.toAngularFormat(doc[i]);
            }
            self.emit('done.readAllByIds', doc);
        } else {
            self.emit('done.readAllByIds', []);
        }
    });
};

module.exports = BlogModel;
