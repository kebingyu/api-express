var express = require('express');
var router = express.Router();
var validator = require('../services/validator');
var blogModel = require('../models/blog');
var BlogModel = require('../models/BlogModel');
var UserModel = require('../models/UserModel');

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

// read all blogs for given user id
router.get('/', function(req, res, next) {
    var blog = new BlogModel(req.db);

    blog.readAll(req.query);

    blog
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

// read blog by blog id
router.get('/:blog_id', function(req, res, next) {
    var blog = new BlogModel(req.db);

    blog.read(req.params, req.query);

    blog
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
    var blog = new BlogModel(req.db);

    blog.update(req.params, req.body);

    blog
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

router.delete('/:blog_id', function(req, res, next) {
    blogModel.getInstance()
        .db(req.db)
        .delete(req.params, req.query, function(response) {
            res.json(response);
        });
});

module.exports = router;
