var express = require('express');
var router = express.Router();
var validator = require('../services/validator');
var blogModel = require('../models/blog');
var userModel = require('../models/user');
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
        userModel.getInstance()
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
