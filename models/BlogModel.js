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
            self.emit('error.database', {error : [err.$err]});
        } else if (result.writeConcernError || result.writeError) {
            self.emit('error.database', {error : ['Internal error.']});
        } else if (result > 0) {
            tagModel.emit('done', {
                success : {
                    id : tag._id.toString(),
                    content : tag.content
                }
            });
        } else {
            self.emit('error.validation', {error : ['Blog not found.']});
        }
    });
};

module.exports = BlogModel;
