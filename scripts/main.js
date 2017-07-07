function Validator(form, opts) {
    //grab inputs
    var reqInputs = form.querySelectorAll('[data-validate]');
    var generalTests = {
        required: function (v) {
            return !!v;
        },
        length: function (v, p) {
            return p[1] ? v.length >= p[0] && v.length <= p[1] : v.length >= p[0];
        },
        regex: function (v, p) {
            return (new RegExp(p[0])).test(v);
        },
        vals: function (v, p) {
            return (new RegExp('^('+p.join('|')+')$')).test(v);
        },
        number: function (v, p) {
            var n = Number(v);
            if (isNaN(n)) return false;

            return !p[0]
                ? true
                : p[1]
                    ? n >= p[0] && n <= p[1]
                    : n >= p[0];
        },
        phone: function (v, p) {
            var length = Number(v.replace(/\D+/g, '')).toString().length;
            return p[0] === undefined
                ? length === 11 || length === 10
                : Number(p[0])
                    ? length === 11
                    : length === 10;
        },
        email: function (v) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        date: function (v, p) {
            DateValidator = opts.dateValidator;
            dvStr = DateValidator.toString();
            var result;
            console.time('DateValidator');
            if (dvStr.indexOf('DateValidator') !== -1) {
                result = DateValidator.testDate(v, p[0]);
            } else if (DateValidator.isMoment) {
                result = DateValidator(v, p[0], true).isValid();
            } else {
                result = (new Date(v) !== "Invalid Date") && !isNaN(new Date(v));
            }
            console.timeEnd('DateValidator');
            console.log(result);
            return result;
        },
        time: function (v, p) {

        },
        datetime: function (v, p) {

        },
        url: function (v, p) {
            var regExStr = p[0] === undefined
                ? ''
                : p[0]
                    ? 'https:\/\/(www\.)?'
                    : 'https?:\/\/(www\.)?';
            return (new RegExp(regExStr + '[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)')).test(v);
        }
    };
    var tests = {
        text: {
            required: generalTests.required,
            regex: generalTests.regex,
            length: generalTests.length,
            number: generalTests.number,
            phone: generalTests.phone,
            email: generalTests.email,
            vals: generalTests.vals,
            url: generalTests.url,
            date: generalTests.date
        },
        checkbox: {
            required: function() {
                return this.checked;
            },
            checked: function() {
                return this.checked;
            }
        },
        color: {
            vals: generalTests.vals,
            range: function (v,p) {
                for (var i = 0; i < p.length; i++) {
                    p[i] = parseInt(p[i], 16);
                    console.log(p[i]);
                }
                v = parseInt(v.substr(1),16);
                console.log(v);
                return !p[0]
                    ? true
                    : p[1]
                        ? v >= p[0] && v <= p[1]
                        : v >= p[0];
            }
        },
        date: {
            required: generalTests.required
        },
        file: {
            required: generalTests.required,
            "accept": function (v) {
                var fileTypes = this.getAttribute('accept').split(',').map(function (val) {
                    return val.trim();
                });
                var isValid = false;
                for (var i = 0; i < fileTypes.length; i++) {
                    if ((new RegExp(fileTypes[i] + '$')).test(v)) {
                        isValid = true;
                        break;
                    }
                }
                return isValid;
            }
        },
        hidden: {
            required: generalTests.required,
            regex: generalTests.regex,
            length: generalTests.length,
            number: generalTests.number,
            phone: generalTests.phone,
            email: generalTests.email,
            vals: generalTests.vals,
            url: generalTests.url
        },
        number: {
            required: generalTests.required,
            range: generalTests.number
        },
        password: {
            required: generalTests.required,
            regex: generalTests.regex,
            length: generalTests.length,
            number: generalTests.number
        },
        radio: {
            required: function () {
                return !!document.querySelector('input[name="'+this.name+'"]:checked');
            }
        },
        search: {
            required: generalTests.required,
            regex: generalTests.regex,
            length: generalTests.length,
            number: generalTests.number,
            phone: generalTests.phone,
            email: generalTests.email,
            vals: generalTests.vals,
            url: generalTests.url
        }
    };

    Node.prototype.getDataAttribute = function(att) {
        if (this.dataset) {
            var attStr = att.split('-').map(function (val, i) {
                return !i ? val : val.charAt(0).toUpperCase() + val.substr(1);
            }).join('');
            return this.dataset[attStr];
        }
        return this.getAttribute('data-' + att);
    };

    function validInputEvent(e) {
        validateInput.call(this, e.target.value);
    }

    function validateInput(val) {
        var isValid = true;

        var validators = this.getDataAttribute('validate').split(',');

        for (var i in validators) {
            try {
                var ruleArr = validators[i].split(':');
                if (!tests[this.type][ruleArr[0]].call(this, val, ruleArr.splice(1))) {
                    isValid = false;
                    break;
                }
            } catch (e) {
                console.error('Invalid rule: ' + ruleArr[0] + ' on type ' + this.type);
            }
        }

        var parent = this.parentElement;
        var span = parent.querySelector('span');

        if (isValid) {
            if (span) {
                parent.removeChild(span);
            }
            return true;
        }

        if (!span) {
            span = document.createElement('span');
        }

        var eStr = 'error-message';
        var eMessageAtt = ruleArr[0].toLowerCase() + '-' + eStr;
        span.innerText = this.getDataAttribute(eMessageAtt) || form.getDataAttribute(eMessageAtt)
            || this.getDataAttribute(eStr) || form.getDataAttribute(eStr) || 'Please enter a valid value';
        eStr = 'error-class';
        var eClass = this.getDataAttribute(eStr) || form.getDataAttribute(eStr);

        if (eClass) {
            if (span.classList) {
                span.classList.add(eClass);
            } else {
                span.className += ' ' + eClass;
            }
        }

        eStr = 'error-input-class';
        var eInputClass = this.getDataAttribute(eStr) || form.getDataAttribute(eStr);
        if (eInputClass) {
            if (this.classList) {
                this.classList.add(eInputClass);
            } else {
                this.className += ' ' + eClass;
            }
        }
        parent.appendChild(span);
        return false;
    }

    //add event listeners
    for (var i = 0; i < reqInputs.length; i++) {
        reqInputs.item(i).addEventListener('change', validInputEvent, false);
    }

    //prevent default form behavior
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var valid = true;
        for (var i = 0; i < reqInputs.length; i++) {
            if (!validateInput.call(reqInputs.item(i), reqInputs.item(i).value)) {
                valid = false;
            }
        }
        if (valid) this.submit();
    });
}