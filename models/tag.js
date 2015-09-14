var objectId = require('mongodb').ObjectID;

var tagModel = (function() {
    var instance;

    var _db; // mongo connection

    var _col = 'tag'; // mongo collection

    function init() {
        // convert to front-end readable format
        function toAngularFormat(data) {
            data.id = data._id.toString();
        }

        function indexInArray(arr, id) {
            return arr.map(function(e) {return e.toString();}).indexOf(id);
        }

        return {
            db : function(db) {
                _db = db;
                return this;
            },
            new : function(data, callback) {
                var blogModel = require('../models/blog');
                // Since upsert at embedded array level is not possible
                // has to do in two steps
                //
                // Check if same tag already created by given user
                _db.get(_col)
                .findOne({
                    user_id    : objectId(data.user_id),
                    content    : data.content
                })
                .on('complete', function(err, doc) {
                    if (err) {
                        return callback({error : [err.$err]});
                    } else if (doc) { // tag already created
                        var idx = indexInArray(doc.blogs, data.blog_id);
                        if (idx == -1) {
                            // This is a new tag to this blog, let's add it
                            _db.get(_col)
                            .update(
                                { _id : doc._id },
                                { $push : {blogs : objectId(data.blog_id)} }
                            )
                            .on('complete', function(err, result) {
                                if (err) {
                                    return callback({error : [err.$err]});
                                } else if (result.writeConcernError || result.writeError) {
                                    return callback({error : ['Internal error.']});
                                } else {
                                    if (result > 0) {
                                        // Now update given blog tags array
                                        blogModel.getInstance()
                                        .db(_db)
                                        .addTag(data.blog_id, doc, callback);
                                    } else {
                                        return callback({success : []});
                                    }
                                }
                            });
                        } else { // Given blog already has this tag, do nothing
                            return callback({success : []});
                        }
                    } else { // No tag found, create new one
                        var now = Date.now();
                        _db.get(_col)
                        .insert({
                            user_id    : objectId(data.user_id),
                            content    : data.content,
                            created_at : now,
                            updated_at : now,
                            blogs      : [objectId(data.blog_id)]
                        })
                        .on('complete', function(err, doc) {
                            if (err) {
                                return callback({error : [err.$err]});
                            } else if (doc) {
                                // Now update given blog's tags array
                                blogModel.getInstance()
                                .db(_db)
                                .addTag(data.blog_id, doc, callback);
                            } else {
                                return callback({error : ['Internal error.']});
                            }
                        });
                    }
                });
            },
            /**
             * Delete tag by tag id
             *
             * params : request params
             * query  : request query
             */
            delete : function(params, query, callback) {
                var blogModel = require('../models/blog');
                // First remove blog id from tag's blogs array
                _db.get(_col)
                .findOne({
                    _id : objectId(params.tag_id)
                })
                .on('complete', function(err, doc) {
                    if (err) {
                        return callback({error : [err.$err]});
                    } else if (doc) {
                        var idx = indexInArray(doc.blogs, query.blog_id);
                        if (idx > -1) {
                            doc.blogs.splice(idx, 1);
                            if (doc.blogs.length > 0) {
                                _db.get(_col)
                                .update(
                                    { _id : doc._id },
                                    { $set : {blogs : doc.blogs} }
                                )
                                .on('complete', function(err, result) {
                                    if (err) {
                                        return callback({error : [err.$err]});
                                    } else if (result.writeConcernError || result.writeError) {
                                        return callback({error : ['Internal error.']});
                                    } else {
                                        if (result > 0) {
                                            // Now remove this tag from given blog
                                            blogModel.getInstance()
                                            .db(_db)
                                            .deleteTag(params.tag_id, query, callback);
                                        } else {
                                            return callback({success : []});
                                        }
                                    }
                                });
                            } else { // No blog is using this tag after deletion, delete it
                                _db.get(_col)
                                .remove(
                                    {_id : doc._id},
                                    {justOne : true}
                                )
                                .on('complete', function (err, result) {
                                    if (err) {
                                        return callback({error : [err.$err]});
                                    } else {
                                        // Now remove this tag from given blog
                                        blogModel.getInstance()
                                        .db(_db)
                                        .deleteTag(params.tag_id, query, callback);
                                    }
                                });
                            }
                        } else {
                            return callback({error : ['Wrong tag or blog id.']});
                        }
                    } else {
                        return callback({error : ['Tag not found.']});
                    }
                });
            },
            /**
             * Delete blog id from array of tag ids. 
             * Used when user deletes a blog
             *
             * tags : array of tag id in objectId format
             */
            deleteBlog : function(tags, blog_id, callback) {
                _db.get(_col)
                .update(
                    {_id : {$in : tags}},
                    {$pull : { blogs: objectId(blog_id) }},
                    {multi : true}
                )
                .on('complete', function(err, result) {
                    if (err) {
                        return callback({error : [err.$err]});
                    } else if (result.writeConcernError || result.writeError) {
                        return callback({error : ['Internal error.']});
                    } else if (result > 0) {
                        // Remove any tags with empty blogs array
                        _db.get(_col)
                        .remove(
                            {
                                _id : {$in : tags},
                                blogs : {$size : 0}
                            }
                        )
                        .on('complete', function (err, result) {
                            if (err) {
                                return callback({error : [err.$err]});
                            } else if (result > 0) {
                                return callback({success : [true]});
                            } else {
                                return callback({success : [false]});
                            }
                        });
                    } else {
                        return callback({success : [false]});
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

module.exports = tagModel;
