var util     = require('util'), 
    event    = require('events'), 
    objectId = require('mongodb').ObjectID;

function TagModel(db) {
    this._db = db; // mongo connection

    this._col = 'tag'; // mongo collection

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
    .on('new.addTagToBlog', function(blog_id, doc) {
        // Now add this tag to the given blog's tags array
        var blog = new BlogModel(self._db);
        blog.addTag(blog_id, doc, self);
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
            self.emit('error.database', {error : [err.$err]});
        } else if (doc) { // tag already created
            var idx = self.indexInArray(doc.blogs, data.blog_id);
            if (idx == -1) { // This is a new tag for this blog, let's add it
                self.emit('new.addBlog', data.blog_id, doc);
            } else { // Given blog already has this tag, do nothing
                self.emit('done', {success : []});
            }
        } else { // No tag found, create new one
            self.emit('new.createTag', data);
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
            self.emit('error.database', {error : [err.$err]});
        } else if (result.writeConcernError || result.writeError) {
            self.emit('error.database', {error : ['Internal error.']});
        } else if (result > 0) {
            self.emit('new.addTagToBlog', blog_id, doc);
        } else {
            self.emit('done', {success : []});
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
            self.emit('error.database', {error : [err.$err]});
        } else if (doc) {
            self.emit('new.addTagToBlog', data.blog_id, doc);
        } else {
            self.emit('error.database', {error : ['Internal error.']});
        }
    });
};

TagModel.prototype.indexInArray = function(arr, id) {
    return arr.map(function(e) {return e.toString();}).indexOf(id);
};

module.exports = TagModel;
