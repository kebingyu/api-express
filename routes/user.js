var express = require('express');
var router = express.Router();
var validator = require('../services/validator');
var UserModel = require('../models/UserModel');

router.use(function (req, res, next) {
    if (req.method == 'POST' || req.method == 'OPTIONS') {
        next();
    } else {
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
    }
});

router.get('/:user_id', function(req, res, next) {
    var user = new UserModel(req.db);

    user.read(req.params);

    user
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

/**
 * Register new user  
 */
router.post('/', function(req, res, next) {
    var rules = {
        'username' : 'required|max:64',
        'email'    : 'required|email|max:64',
        'password' : 'required|confirmed|min:6'
    };
    var msg = validator.getInstance()
        .rules(rules)
        .validate(req.body);
    if (msg.length > 0) {
        res.json({error : msg});
    } else {
        var user = new UserModel(req.db);

        user.new(req.body);

        user
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

router.put('/:user_id', function(req, res, next) {
    var user = new UserModel(req.db);

    user.update(req.body);

    user
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

router.delete('/:user_id', function(req, res, next) {
    var user_id = req.params.user_id;
    res.json({user:user_id});
});

module.exports = router;
