var express = require('express');
var router = express.Router();
var validator = require('../services/validator');
var tokenModel = require('../models/token');

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
        tokenModel.getInstance()
            .db(req.db)
            .remove(req.body, function(response) {
                res.json(response);
            });
    }
});

module.exports = router;
