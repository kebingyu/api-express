var express = require('express');
var router = express.Router();
var validator = require('../services/validator');
var UserModel = require('../models/User');
var tagModel = require('../models/tag');

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
        tagModel.getInstance()
            .db(req.db)
            .new(req.body, function(response) {
                res.json(response);
            });
    }
});

// Delete tag from given blog
router.delete('/:tag_id', function(req, res, next) {
    tagModel.getInstance()
        .db(req.db)
        .delete(req.params, req.query, function(response) {
            res.json(response);
        });
});

module.exports = router;
