var express = require('express');
var router = express.Router();
var validator = require('../services/validator');
var UserModel = require('../models/UserModel');

/**
 * Logout
 */
router.post('/', function(req, res, next) {
    var rules = {
        'user_id' : 'required',
        'token' : 'required'
    };
    var msg = validator.getInstance()
        .rules(rules)
        .validate(req.body);
    if (msg.length > 0) {
        res.json({error : msg});
    } else {
        var user = new UserModel(req.db);

        user.logout(req.body);

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
