/**
 * Initialize validation on form
 * Attaches event listeners to form submit and input change
 * @param form - the form element to validate
 * @param opts - user defined options to override default behavior.
 * @constructor
 */
function Validator(form, opts) {
    this.form = form;

    //combine default options and user defined options
    if (opts) {
        this.opts = mergeObjects(this.opts, opts);
    }

    //combine user-defined/default error values with error values on form element
    // This results in the following chain or priority for error values
    // Form Element > User Defined > Default
    this.opts.errorValues = mergeObjects(this.opts.errorValues, this.getErrorValues(this.form));

    //For reference within event listeners
    var self = this;

    // Get of the forms inputs requiring validation
    this.reqInputs = this.form.querySelectorAll('[data-' + this.opts.attributes.validate + ']');

    // Add event listeners to inputs
    if (this.opts.attachToEvents.change) {
        for (var i = 0; i < this.reqInputs.length; i++) {
            this.reqInputs.item(i).addEventListener('change', function (e) {
                self.validateInput(this);
            }, false);
        }
    }

    // Add event listener to form submit
    if (this.opts.attachToEvents.submit) {
        this.form.addEventListener('submit', function (e) {
            e.preventDefault();
            var valid = self.validateNodeList(self.reqInputs);
            if (valid) {
                return self.opts.then(this);
            }
        });
    }
}

//
/**
 * Get a value from an elements dataset including polyfill for ie
 * @param el - element whose dataset will searched
 * @param att - kebab-case attribute name without data prefix (e.g. 'error-class')
 * @returns {*} - attribute value or undefined if not present on element
 */
function getDataAttribute(el, att) {
    if (el.dataset) {
        var attStr = att.split('-').map(function (val, i) {
            return !i ? val : val.charAt(0).toUpperCase() + val.substr(1);
        }).join('');
        return el.dataset[attStr];
    }
    return el.getAttribute('data-' + att);
}

/**
 * Function for merging two objects with polyfill for ie9
 * performs single depth copy
 * @param obj1
 * @param obj2
 * @returns {*}
 */
function mergeObjects(obj1, obj2) {
    var output = {};
    var args = [].slice.call(arguments);
    for (var i in args) {
        for (var p in args[i]) {
            if (typeof args[i][p] === 'object' && args[i][p]) {
                var att = Number(i) ? output[p] : {};
                for (var attName in args[i][p]) {
                    if (args[i][p][attName]) {
                        att[attName] = args[i][p][attName];
                    }
                }
                // console.log(p, att);
                output[p] = att;
            } else if (args[i][p]) {
                output[p] = args[i][p];
            }
        }
    }
    return output;
}

// Default options
Validator.prototype.opts = {
    // class/library to use for validating dates (i.e. DateValidator, moment)
    dateValidator: null,

    // callback function called after form is fully valid
    then: function (f) {
        f.submit();
    },

    // data attribute names to be used for specifying behavior inline
    attributes: {
        validate: 'validate',
        errorMessage: 'error-message',
        errorClass: 'error-class',
        errorInputClass: 'error-input-class'
    },

    // value to delimit validation rules and parameters in inline attribute
    delimiters: {
        func: ',',
        parameters: ':'
    },

    // form-wide values after error is found
    // overridden by inline values on form element
    errorValues: {
        eClass: 'error-message',
        eInputClass: 'error-input',
        eMessage: 'Please enter a valid value'
    },

    attachToEvents: {
        change: true,
        submit: true
    }
};

// Tests which are used on multiple input types
Validator.prototype.generalTests = {
    required: function (el) {
        return !!el.value;
    },
    length: function (el, p) {
        var v = el.value;
        return p[1] ? v.length >= p[0] && v.length <= p[1] : v.length >= p[0];
    },
    regex: function (el, p) {
        return (new RegExp(p[0])).test(el.value);
    },
    vals: function (el, p) {
        var v = el.value.toLowerCase();
        var vals = [];
        for (var i = 0; i < p.length; i++) {
            if (p[i].indexOf('!') !== -1) {
                if (v.indexOf(p[0].substr(1)) !== -1) return false;
            } else {
                vals.push(p[i].toLowerCase());
            }
        }
        return !vals.length ? true : (new RegExp('^('+p.join('|')+')$')).test(v);
    },
    number: function (el, p) {
        var n = Number(el.value);
        if (isNaN(n)) return false;

        return !p[0]
            ? true
            : p[1]
                ? n >= p[0] && n <= p[1]
                : n >= p[0];
    },
    phone: function (el, p) {
        var length = Number(el.value.replace(/\D+/g, '')).toString().length;
        return p[0] === undefined
            ? length === 11 || length === 10
            : Number(p[0])
                ? length === 11
                : length === 10;
    },
    email: function (el) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value);
    },
    date: function (el, p) {
        var v = el.value;
        var dv = this.opts.dateValidator;
        if (!dv) {
            return (new Date(v) !== "Invalid Date") && !isNaN(new Date(v));
        }
        if (dv.toString().indexOf('DateValidator') !== -1) {
            return dv.testDate(v, p[0]);
        } else if (dv.isMoment) {
            return dv(v, p[0], true).isValid();
        }
    },
    // time: function (el, p) {
    //
    // },
    // datetime: function (el, p) {
    //
    // },
    url: function (el, p) {
        var regExStr = p[0] === undefined
            ? ''
            : p[0]
                ? 'https:\/\/(www\.)?'
                : 'https?:\/\/(www\.)?';
        return (new RegExp(regExStr + '[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)')).test(el.value);
    },
    match: function (el, p) {
        // todo: setup event listeners for validation on both elements
        return el.value === this.form.querySelector('#' + p[0]).value;
    }
};

// Set of test functions grouped by input type which will be run on validation
// All rules should return a boolean specifying the validity of the input value against the rule
Validator.prototype.tests = {
    text: {
        required: Validator.prototype.generalTests.required,
        regex: Validator.prototype.generalTests.regex,
        length: Validator.prototype.generalTests.length,
        number: Validator.prototype.generalTests.number,
        phone: Validator.prototype.generalTests.phone,
        email: Validator.prototype.generalTests.email,
        vals: Validator.prototype.generalTests.vals,
        url: Validator.prototype.generalTests.url,
        date: Validator.prototype.generalTests.date,
        match: Validator.prototype.generalTests.match
    },
    "select-one": {
        required: Validator.prototype.generalTests.required,
        vals: Validator.prototype.generalTests.vals
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
        vals: Validator.prototype.generalTests.vals,
        range: function (el, p) {
            for (var i = 0; i < p.length; i++) {
                p[i] = parseInt(p[i], 16);
            }
            var v = parseInt(el.value.substr(1),16);
            return !p[0]
                ? true
                : p[1]
                    ? v >= p[0] && v <= p[1]
                    : v >= p[0];
        }
    },
    date: {
        required: Validator.prototype.generalTests.required
    },
    file: {
        required: Validator.prototype.generalTests.required,
        "accept": function (el) {
            var fileTypes = getDataAttribute('accept').split(',').map(function (val) {
                return val.trim();
            });
            var isValid = false;
            for (var i = 0; i < fileTypes.length; i++) {
                if ((new RegExp(fileTypes[i] + '$')).test(el.value)) {
                    isValid = true;
                    break;
                }
            }
            return isValid;
        }
    },
    hidden: {
        required: Validator.prototype.generalTests.required,
        regex: Validator.prototype.generalTests.regex,
        length: Validator.prototype.generalTests.length,
        number: Validator.prototype.generalTests.number,
        phone: Validator.prototype.generalTests.phone,
        email: Validator.prototype.generalTests.email,
        vals: Validator.prototype.generalTests.vals,
        url: Validator.prototype.generalTests.url,
        match: Validator.prototype.generalTests.match
    },
    number: {
        required: Validator.prototype.generalTests.required,
        range: Validator.prototype.generalTests.number,
        match: Validator.prototype.generalTests.match
    },
    password: {
        required: Validator.prototype.generalTests.required,
        regex: Validator.prototype.generalTests.regex,
        length: Validator.prototype.generalTests.length,
        number: Validator.prototype.generalTests.number,
        match: Validator.prototype.generalTests.match
    },
    radio: {
        required: function (el) {
            return !!document.querySelector('input[name="'+el.name+'"]:checked');
        }
    },
    search: {
        required: Validator.prototype.generalTests.required,
        regex: Validator.prototype.generalTests.regex,
        length: Validator.prototype.generalTests.length,
        number: Validator.prototype.generalTests.number,
        phone: Validator.prototype.generalTests.phone,
        email: Validator.prototype.generalTests.email,
        vals: Validator.prototype.generalTests.vals,
        url: Validator.prototype.generalTests.url,
        match: Validator.prototype.generalTests.match
    }
};

/**
 * Get error values from element, used to get form-wide values from form element
 * Does not get rule specific values, only "universally relevant" values
 *
 * @param form - the element to search
 * @returns Object containing the found values
 */
Validator.prototype.getErrorValues = function (form) {
    var atts = this.opts.attributes;

    return {
        eClass: getDataAttribute(form, atts.errorClass),
        eInputClass: getDataAttribute(form, atts.errorInputClass),
        eMessage: getDataAttribute(form, atts.errorMessage)
    };
};

/**
 * Determines validity of an element based on inline specified validation rules
 * @param el - the element to test
 * @param val - the value of the element
 * @param [opts] - options in the same form as this.opts. For static use with function
 * @returns {boolean} - validity of element
 */
Validator.prototype.validateInput = function(el, opts) {
    // polyfill function for adding a class to an element
    function addClass(innerEl, className) {
        if (className) {
            if (innerEl.classList) {
                innerEl.classList.add(className);
            } else {
                innerEl.className += ' ' + className;
            }
        }
    }

    if (!opts) {
        opts = this.opts;
    } else {
        opts = mergeObjects(this.opts, opts)
    }
    var atts = opts.attributes;

    // get array of validation rules for the element using the relevant validation attribute and delimiter
    var validators = getDataAttribute(el, this.opts.attributes.validate).split(opts.delimiters.func);

    var isValid = true;

    // test element for all validation rules
    for (var i in validators) {
        try {
            // split validation string by parameter delimiter to get array of parameters
            var ruleArr = validators[i].split(opts.delimiters.parameters);

            // run validation test using tests obj. "this" is applied for referencing by called function
            if (!el.value && ruleArr[0] !== 'required') continue;
            if (!this.tests[el.type][ruleArr[0]].call(this, el, ruleArr.splice(1))) {
                isValid = false;
                break;
            }
        } catch (e) {
            //     console.error(e);
            // if error occured specified rule most-likely does not exist on input type
            console.error('Invalid rule: ' + ruleArr[0] + ' on type ' + el.type);
        }
    }

    var parent = el.parentElement;

    // check if input already has attached error element
    var span = parent.querySelector('span.' + opts.errorValues.eClass);

    // get error class from input element or form-wide values
    var eInputClass = getDataAttribute(el, atts.errorInputClass) || opts.errorValues.eInputClass;

    if (isValid) {
        // if error element was already created, remove
        if (span) {
            parent.removeChild(span);
        }

        // if input class was specified remove class from input in-case it was applied previously
        // note: this is using a polyfill for ie support
        if (eInputClass) {
            if (el.classList) {
                el.classList.remove(eInputClass);
            } else {
                var index = el.className.indexOf(eInputClass);
                if (index) {
                    el.className = el.className.substr(index, eInputClass.length);
                }
            }
        }
        return true;
    }

    // if input is not valid apply input class to input element
    if (eInputClass) {
        addClass(el,eInputClass);
    }

    // if span was not previously create now
    if (!span) {
        span = document.createElement('span');
    }

    // get attribute name for error message, using variable to avoid repetition of longer name
    var eStr = atts.errorMessage;

    // get rule specific error message attribute name
    var eMessageAtt = eStr + '-' + ruleArr[0].toLowerCase();

    // if not static, check for rule specific error message and add to list of values
    if (this.form && !opts.errorValues[eMessageAtt]) {
        opts.errorValues[eMessageAtt] = getDataAttribute(this.form, eMessageAtt);
    }

    // set text of error element based on available values in the following priority
    // rule specific input att > rule specific form att > input att > form att > constructor provided value
    span.innerText = getDataAttribute(el, eMessageAtt) || opts.errorValues[eMessageAtt]
        || getDataAttribute(el, eStr) || opts.errorValues.eMessage;

    // get error class with following priority
    // input att > form att > constructor provided value
    var eClass = getDataAttribute(el, atts.errorClass) || opts.errorValues.eClass;

    if (eClass) {
        addClass(span, eClass);
    }

    parent.appendChild(span);
    return false;
};

/**
 * Validate node list of input elements
 * @param {NodeList} nodeList - list of elements to validate
 * @param [opts] - user defined options. For static use
 * @returns {boolean} - validity of node list
 */
Validator.prototype.validateNodeList = function(nodeList, opts) {
    var valid = true;
    // console.time('Form Validation');
    for (var i = 0; i < nodeList.length; i++) {
        if (!this.validateInput(nodeList.item(i), opts)) {
            valid = false;
        }
    }
    // console.timeEnd('Form Validation');

    // if callback function provided call
    if (valid && opts && opts.then) {
        opts.then();
    }
    return valid;
};