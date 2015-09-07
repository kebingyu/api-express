var validator = (function() {
    var instance;

    var _rules = {};

    function init() {
        // Validate different rules
        var Validate = {
            required : function(key, val) {
                var msg = '';
                if (!val) {
                    msg = key + ' is required.';
                }
                return msg;
            },
            email : function(key, val) {
                var msg = '';
                var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
                if (!re.test(val)) {
                    msg = 'Please provide a valid email.';
                }
                return msg;
            },
            max : function(key, val, len) {
                var msg = '';
                if (val && val.length > len) {
                    msg = key + ' exceeds ' + len + ' characters.';
                }
                return msg;
            },
            min : function(key, val, len) {
                var msg = '';
                if (val && val.length < len) {
                    msg = key + ' must be longer than ' + len + ' characters.';
                }
                return msg;
            },
            confirmed : function(key, data) {
                // By default look for "key" and "key_confirmation"
                var msg;
                if (data[key] && data[key + '_confirmation']
                    && data[key] == data[key + '_confirmation']) {
                    msg = '';
                } else {
                    msg = key + ' provided do not match.';
                }
                return msg;
            }
        };

        function validateRules(data) {
            var messages = [], msg = '', rules, rule;
            for (var key in _rules) {
                rules = _rules[key].split('|');
                for (var i = 0, j = rules.length; i < j; i++) {
                    rule = rules[i];
                    if (rule.indexOf(':') > -1) {
                        var sep = rule.split(':');
                        switch (sep[0]) {
                            case 'min':
                            case 'max':
                                msg = Validate[sep[0]](key, data[key], parseInt(sep[1]));
                                break;
                            default:
                                break;
                        }
                    } else if (rule == 'confirmed') {
                        msg = Validate[rule](key, data);
                    } else if (Validate.hasOwnProperty(rule)) {
                        msg = Validate[rule](key, data[key]);
                    }
                    if (msg.length > 0) {
                        messages.push(msg);
                    }
                }
            }
            return messages;
        }

        return {
            rules : function(rules) {
                _rules = rules;
                return this;
            },
            validate : function(data) {
                return validateRules(data);
            }
        }
    }

    return {
        getInstance : function() {
            if (!instance) {
                instance = init();
            }
            return instance;
        }
    }

})();

module.exports = validator;
