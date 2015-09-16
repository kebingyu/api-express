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
 * Add tag to given blog
 *
 * Request starts with TagModel so its instance emits message
 *
 * tag : tag document
 * tagModel : TagModel instance
 */
BlogModel.prototype.addTag = function(blog_id, tag, tagModel) {
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
            tagModel.emit('error.database', {error : [err.$err]});
        } else if (result.writeConcernError || result.writeError) {
            tagModel.emit('error.database', {error : ['Internal error.']});
        } else if (result > 0) {
            tagModel.emit('done', {
                success : {
                    id : tag._id.toString(),
                    content : tag.content
                }
            });
        } else {
            tagModel.emit('error.validation', {error : ['Blog not found.']});
        }
    });
};

/**
 * Delete tag from blog's tags array  
 *
 * Request starts with TagModel so its instance emits message
 *
 * tagModel : TagModel instance
 */
BlogModel.prototype.deleteTag = function(tag_id, data, tagModel) {
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
            tagModel.emit('error.database', {error : [err.$err]});
        } else if (result.writeConcernError || result.writeError) {
            tagModel.emit('error.database', {error : ['Internal error.']});
        } else {
            if (result > 0) {
                tagModel.emit('done', {success : [true]});
            } else {
                tagModel.emit('done', {success : [false]});
            }
        }
    });
};

module.exports = BlogModel;
