var express = require('express');
var router = express.Router();
var validator = require('../services/validator');
var userModel = require('../models/user');

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
        userModel.getInstance()
            .db(req.db)
            .login(req.body, function(response) {
                res.json(response);
            });
    }
});

module.exports = router;
