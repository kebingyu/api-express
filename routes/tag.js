var express = require('express');
var router = express.Router();
var validator = require('../services/validator');
var UserModel = require('../models/UserModel');
var TagModel = require('../models/TagModel');

router.use(function (req, res, next) {
    var rules = {
        'user_id' : 'required',
        'token'   : 'required'
    };
    var msg = validator.getInstance()
    .rules(rules)
    .validate(req.query);
    if (msg.length > 0) {
        res.json({error : msg});
    } else {
        var user = new UserModel(req.db);

        user.expired(req.query);

        user
        .on('allowAccess', function(response) {
            next();
        })
        .on('error.database', function(response) {
            res.json(response);
        })
        .on('error.validation', function(response) {
            res.json(response);
        });
    }
});

// create new tag
router.post('/', function(req, res, next) {
    var rules = {
        'user_id' : 'required',
        'blog_id' : 'required',
        'content' : 'required'
    };
    var msg = validator.getInstance()
        .rules(rules)
        .validate(req.body);
    if (msg.length > 0) {
        res.json({error : msg});
    } else {
        var tag = new TagModel(req.db);

        tag.new(req.body);

        tag
        .on('done', function(response) {
            res.json(response);
        })
        .on('error.database', function(response) {
            res.json(response);
        })
        .on('error.validation', function(response) {
            res.json(response);
        });
    }
});

// Delete tag from given blog
router.delete('/:tag_id', function(req, res, next) {
    var tag = new TagModel(req.db);

    tag.delete(req.params, req.query);

    tag
    .on('done', function(response) {
        res.json(response);
    })
    .on('error.database', function(response) {
        res.json(response);
    })
    .on('error.validation', function(response) {
        res.json(response);
    });
});

module.exports = router;
