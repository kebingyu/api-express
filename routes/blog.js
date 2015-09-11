var express = require('express');
var router = express.Router();
var validator = require('../services/validator');
var blogModel = require('../models/blog');
var tokenModel = require('../models/token');

router.use(function (req, res, next) {
    tokenModel.getInstance()
        .db(req.db)
        .expired(req.query, function(response) {
            if (response.error) {
                res.json(response);
            } else if (response.success) {
                res.json({error : ['Access token expired.']});
            } else {
                next();
            }
        });
});

// read all blogs for given user id
router.get('/', function(req, res, next) {
    blogModel.getInstance()
        .db(req.db)
        .readAll(req.query, function(response) {
            res.json(response);
        });
});

// read blog by blog id
router.get('/:blog_id', function(req, res, next) {
    blogModel.getInstance()
        .db(req.db)
        .read(req.params, req.query, function(response) {
            res.json(response);
        });
});

// create new blog
router.post('/', function(req, res, next) {
    var rules = {
        'user_id' : 'required',
        'title'   : 'required|max:255',
        'content' : 'required'
    };
    var msg = validator.getInstance()
        .rules(rules)
        .validate(req.body);
    if (msg.length > 0) {
        res.json({error : msg});
    } else {
        blogModel.getInstance()
            .db(req.db)
            .new(req.body, function(response) {
                res.json(response);
            });
    }
});

// update blog
router.put('/:blog_id', function(req, res, next) {
    blogModel.getInstance()
        .db(req.db)
        .update(req.params, req.body, function(response) {
            res.json(response);
        });
});

router.delete('/:blog_id', function(req, res, next) {
    blogModel.getInstance()
        .db(req.db)
        .delete(req.params, req.query, function(response) {
            res.json(response);
        });
});

module.exports = router;
