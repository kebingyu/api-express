var express = require('express');
var router = express.Router();
var validator = require('../services/validator');
var UserModel = require('../models/User');

/**
 * Login
 */
router.post('/', function(req, res, next) {
    var rules = {
        'username' : 'required',
        'password' : 'required'
    };
    var msg = validator.getInstance()
        .rules(rules)
        .validate(req.body);
    if (msg.length > 0) {
        res.json({error : msg});
    } else {
        var user = new UserModel(req.db);

        user.login(req.body);

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

module.exports = router;
