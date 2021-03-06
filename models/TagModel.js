var util     = require('util'), 
    event    = require('events'), 
    objectId = require('mongodb').ObjectID;

function TagModel(db, emitter) {
    this._db = db; // mongo connection

    this._col = 'tag'; // mongo collection

    // Instance to publish and subscribe the events
    this._emitter = emitter ? emitter : this;

    event.EventEmitter.call(this);
}

util.inherits(TagModel, event.EventEmitter);

TagModel.prototype.new = function(data) {
    var self = this,
        BlogModel = require('../models/BlogModel');

    // Since upsert at embedded array level is not possible
    // has to do in two steps
    //
    // Check if same tag already created by given user
    self.withSameContentCreatedByUser(data);

    self
    .on('new.addBlog', function(blog_id, doc) {
        // Tag created but new to this blog
        self.addBlog(blog_id, doc);
    })
    .on('new.createTag', function(data) {
        // Tag not created yet
        self.createTag(data);
    })
    .on('done.addBlog', function(blog_id, doc) {
        // Now add this tag to the given blog's tags array
        var blog = new BlogModel(self._db, self);
        blog.addTag(blog_id, doc);
    })
    .on('done.createTag', function(blog_id, doc) {
        // Now add this tag to the given blog's tags array
        var blog = new BlogModel(self._db, self);
        blog.addTag(blog_id, doc);
    });
};

/**
 * Delete tag from blog  
 */
TagModel.prototype.delete = function(params, query) {
    var self = this,
        BlogModel = require('../models/BlogModel');

    self.findById(params.tag_id);

    self
    .on('done.findById', function(doc) {
        var idx = self.indexInArray(doc.blogs, query.blog_id);
        if (idx > -1) {
            // Remove this blog id from tag's blogs array
            doc.blogs.splice(idx, 1);
            if (doc.blogs.length > 0) {
                self.updateBlogsArray(doc);
            } else { // This tag has empty blogs array after deletion, delete it
                self.deleteById(params.tag_id);
            }
        } else { // This blog does not use this tag
            self._emitter.emit('error.validation', {error : ['Wrong tag or blog id.']});
        }
    })
    .on('done.updateBlogsArray', function() {
        // Now remove this tag from given blog
        var blog = new BlogModel(self._db, self);
        blog.deleteTag(params.tag_id, query);
    })
    .on('done.deleteById', function() {
        // Now remove this tag from given blog
        var blog = new BlogModel(self._db, self);
        blog.deleteTag(params.tag_id, query);
    });
};

TagModel.prototype.withSameContentCreatedByUser = function(data) {
    var self = this;

    self._db.get(self._col)
    .findOne({
        user_id : objectId(data.user_id),
        content : data.content
    })
    .on('complete', function(err, doc) {
        if (err) {
            self._emitter.emit('error.database', {error : [err.$err]});
        } else if (doc) { // tag already created
            var idx = self.indexInArray(doc.blogs, data.blog_id);
            if (idx == -1) { // This is a new tag for this blog, let's add it
                self._emitter.emit('new.addBlog', data.blog_id, doc);
            } else { // Given blog already has this tag, do nothing
                self._emitter.emit('done', {success : []});
            }
        } else { // No tag found, create new one
            self._emitter.emit('new.createTag', data);
        }
    });
};

TagModel.prototype.addBlog = function(blog_id, doc) {
    var self = this;

    self._db.get(self._col)
    .update(
        { _id : doc._id },
        { $push : {blogs : objectId(blog_id)} }
    )
    .on('complete', function(err, result) {
        if (err) {
            self._emitter.emit('error.database', {error : [err.$err]});
        } else if (result.writeConcernError || result.writeError) {
            self._emitter.emit('error.database', {error : ['Internal error.']});
        } else if (result > 0) {
            self._emitter.emit('done.addBlog', blog_id, doc);
        } else {
            self._emitter.emit('done', {success : []});
        }
    });
};

TagModel.prototype.createTag = function(data) {
    var now  = Date.now(),
        self = this;
    self._db.get(self._col)
    .insert({
        user_id    : objectId(data.user_id),
        content    : data.content,
        created_at : now,
        updated_at : now,
        blogs      : [objectId(data.blog_id)]
    })
    .on('complete', function(err, doc) {
        if (err) {
            self._emitter.emit('error.database', {error : [err.$err]});
        } else if (doc) {
            self._emitter.emit('done.createTag', data.blog_id, doc);
        } else {
            self._emitter.emit('error.database', {error : ['Internal error.']});
        }
    });
};

TagModel.prototype.indexInArray = function(arr, id) {
    return arr.map(function(e) {return e.toString();}).indexOf(id);
};

TagModel.prototype.findById = function(id) {
    var self = this;

    self._db.get(self._col)
    .findOne({
        _id : objectId(id)
    })
    .on('complete', function(err, doc) {
        if (err) {
            self._emitter.emit('error.database', {error : [err.$err]});
        } else if (doc) {
            self._emitter.emit('done.findById', doc);
        } else {
            self._emitter.emit('error.validation', {error : ['Tag not found.']});
        }
    });
};

TagModel.prototype.updateBlogsArray = function(doc) {
    var self = this;

    self._db.get(self._col)
    .update(
        { _id : doc._id },
        { $set : {blogs : doc.blogs} }
    )
    .on('complete', function(err, result) {
        if (err) {
            self._emitter.emit('error.database', {error : [err.$err]});
        } else if (result.writeConcernError || result.writeError) {
            self._emitter.emit('error.database', {error : ['Internal error.']});
        } else {
            if (result > 0) {
                self._emitter.emit('done.updateBlogsArray');
            } else {
                self._emitter.emit('done', {success : []});
            }
        }
    });
};

TagModel.prototype.deleteById = function(tag_id) {
    var self = this;

    self._db.get(self._col)
    .remove(
        {_id : objectId(tag_id)},
        {justOne : true}
    )
    .on('complete', function (err, result) {
        if (err) {
            self._emitter.emit('error.database', {error : [err.$err]});
        } else {
            self._emitter.emit('done.deleteById');
        }
    });
};

/**
 * For view blogs by tag  
 */
TagModel.prototype.getBlogsByTagContent = function(data) {
    var self = this;

    self._db.get(self._col)
    .findOne({
        user_id : objectId(data.user_id),
        content : data.tag
    })
    .on('complete', function(err, doc) {
        if (err) {
            self._emitter.emit('error.database', {error : [err.$err]});
        } else if (doc) {
            self._emitter.emit('done.getBlogsByTagContent', doc);
        } else {
            self._emitter.emit('done', {success : []});
        }
    });
};

/**
 * Delete blog id from tag's blogs array. Used by BlogModel when 
 * deleting a blog.
 */
TagModel.prototype.deleteBlog = function(tags, blog_id) {
    var self = this;

    self._db.get(self._col)
    .update(
        {_id : {$in : tags}},
        {$pull : { blogs: objectId(blog_id) }},
        {multi : true}
    )
    .on('complete', function(err, result) {
        if (err) {
            self._emitter.emit('error.database', {error : [err.$err]});
        } else if (result.writeConcernError || result.writeError) {
            self._emitter.emit('error.database', {error : ['Internal error.']});
        } else if (result > 0) {
            // Some tags are updated. Clean up tags with empty blogs array
            self._emitter.emit('done.deleteBlog', tags);
        } else {
            // This blog owns no tags. We are done.
            self._emitter.emit('done', {success : [true]});
        }
    });
};

/**
 *  Remove any tags with empty blogs array. Used by BlogModel when
 *  deleting a blog.
 */
TagModel.prototype.removeOrphanTags = function(tags) {
    var self = this;

    self._db.get(self._col)
    .remove(
        {
            _id : {$in : tags},
            blogs : {$size : 0}
        }
    )
    .on('complete', function (err, result) {
        if (err) {
            self._emitter.emit('error.database', {error : [err.$err]});
        } else {
            self._emitter.emit('done.removeOrphanTags', {success : [true]});
        }
    });
};

module.exports = TagModel;
