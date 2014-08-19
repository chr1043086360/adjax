var adjax = function (data, views, type) {
    var types = {};
    var funcs = {};

    var TYPE_NAME = '__name__';

    /*
     * Cookies
     */
    var cookies = (function () {
        /*
         * Get cookie value by name
         */
        var get = function (name) {
            var value = '; ' + document.cookie;
            var parts = value.split('; ' + name + '=');
            if (parts.length == 2) {
                return parts.pop().split(';').shift();
            }
        }

        // TODO: Implement cookies set and all

        return {
            'get': get,
            'set': null,
            'all': null,
        };
    })();

    /*
     * Serializer
     */
    var serializer = (function () {
        /*
         * Serialize to string
         */
        var encode = function (data) {
            return JSON.stringify(data, function (key, value) {
                if (key !== '' && typeof value === 'object') {
                    var name = value.constructor[TYPE_NAME];
                    if (name in funcs) {
                        var data = funcs[name]['encode'](value);
                        data[type] = name;
                        return data;
                    }
                }
                return value;
            });
        };

        /*
         * Deserialize from string
         */
        var decode = function (data) {
            return JSON.parse(data, function (key, value) {
                if (typeof value === 'object' && value[type] !== undefined) {
                    return types[value[type]]['decode'](value);
                }
                return value;
            });
        };

        return {
            'encode': encode,
            'decode': decode,
        };
    })();

    /*
     * Utilities
     */
    var utils = (function () {
        /*
         * Equivalent to python's zip(...)
         */
        var zip = function (arrays) {
            return Array.apply(
                null, Array(arrays[0].length)
            ).map(function (_, i) {
                return arrays.map(function (array) {
                    return array[i]
                });
            });
        };

        /*
         * Equivalent to python's dict(...)
         */
        var obj = function (array) {
            var data = {};
            array.forEach(function (item) {
                data[item[0]] = item[1];
            });
            return data;
        };

        return {
            'zip': zip,
            'obj': obj,
        };
    })();

    /*
     * Call AJAX view
     */
    var pipeline = [];
    var call = function (app) {
        return function (name) {
            var view = views[app][name];

            return function () {
                /*
                 * Get request data and callback
                 */
                var callback;
                var values = Array.prototype.slice.call(arguments, 0);
                if (typeof arguments[arguments.length - 1] === 'function') {
                    callback = values.pop();
                }
                var data = utils.obj(utils.zip([view['args'], values]));

                /*
                 * Make request
                 */
                var xhr = new XMLHttpRequest();
                xhr.open('POST', view['url']);
                if (callback) {
                    xhr.onreadystatechange = function () {
                        if (xhr.readyState === 4) {
                            var data;
                            try {
                                data = serializer.decode(xhr.responseText);
                            } catch (e) {
                                data = null;
                            }
                            callback(data);
                        }
                    };
                }
                pipeline.forEach(function (item) {
                    item(xhr);
                });
                xhr.send(serializer.encode(data));
            };
        };
    };

    /*
     * Register custom type
     */
    var register = function (name, constructor, data) {
        constructor[TYPE_NAME] = name;
        types[name] = data;
        funcs[name] = data;
    };

    return {
        'data': data,
        'views': views,
        'type': type,

        'types': types,
        'funcs': funcs,

        'cookies': cookies,
        'serializer': serializer,
        'utils': utils,

        'pipeline': pipeline,
        'call': call,
        'register': register
    };
};
