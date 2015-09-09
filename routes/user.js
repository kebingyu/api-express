var express = require('express');
var router = express.Router();
var validator = require('../services/validator');
var userModel = require('../models/user');
var tokenModel = require('../models/token');

router.use(function (req, res, next) {
    if (req.method == 'POST' || req.method == 'OPTIONS') {
        next();
    } else {
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
    }
});

router.get('/:user_id', function(req, res, next) {
    var user_id = req.params.user_id;
    res.json({user:user_id});
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
        userModel.getInstance()
            .db(req.db)
            .new(req.body, function(response) {
                res.json(response);
            });
    }
});

router.put('/:user_id', function(req, res, next) {
    // req.query, req.params
    var user_id = req.params.user_id;
    res.json({user:user_id});
});

router.delete('/:user_id', function(req, res, next) {
    var user_id = req.params.user_id;
    res.json({user:user_id});
});

module.exports = router;
