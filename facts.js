/*global _:true*/
(function () {
    'use strict';

    function declare(_) {
        function deep(object, path, value) {
            var keys = path.split('.'),
                length = keys.length;

            function walk(key, i) {
                if (_.isObject(object)) {
                    if (value !== undefined) {
                        if (i === length - 1) {
                            object[key] = value;
                        } else if (!_.isObject(object[key])) {
                            object[key] = {};
                        }
                    }

                    object = object[key];
                } else {
                    object = undefined;
                }
            }

            _.each(keys, walk);

            return object;
        }

        function Rules(options) {
            var rules = [],
                nextRuleId = 0;

            function shouldEvaluateCondition(rule, changes) {
                // if a rule is dependent on a specific set of variables it doesn't
                // need to be run unless those variables have changed
                if (!rule.condition.deps) {
                    return true;
                } else {
                    return _.any(rule.condition.deps, function (dep) {
                        return deep(changes, dep) !== undefined;
                    });
                }
            }

            function processRule(engine, rule) {
                var result = rule.condition(engine);
                if (_.isFunction(result.then)) {
                    result.then(function (promiseResult) {
                        maybeFireRule(engine, rule, promiseResult);
                    });
                } else {
                    maybeFireRule(engine, rule, result);
                }
                engine.notify('process', {
                    rule: rule
                });
            }

            function maybeFireRule(engine, rule, conditionResult) {
                conditionResult = !!conditionResult;
                if (conditionResult && conditionResult !== engine.state[rule.id]) {
                    rule.fire(engine);
                    engine.notify('fire', {
                        rule: rule
                    });
                }
                engine.state[rule.id] = conditionResult;
            }

            this.add = function (rule) {
                if (_.isArray(rule)) {
                    _.each(rule, this.add, this);
                } else {
                    rule.id = nextRuleId++;
                    rules.push(rule);
                    return this;
                }
            };

            this.fire = function (engine, changes) {
                _.each(rules, function (rule) {
                    if (shouldEvaluateCondition(rule, changes)) {
                        processRule(engine, rule);
                    }
                });
            };

            // add the rules passed into the constructor
            if (options && options.rules) {
                this.add(options.rules);
            }
        }

        function RulesEngine(options) {
            var self = this,
                facts = {},
                rules = options.rules || new Rules(),
                state = {},
                inFire = false,
                queueFire = false,
                queuedChanges = {},
                listeners = {
                    change: [],
                    process: [],
                    fire: []
                };

            this.facts = facts;
            this.state = state;

            function fire(changes) {
                var shouldFire;

                // if a rule fire asserts more facts, queue fire until all of the
                // current rules are processed.
                if (inFire) {
                    queueFire = true;
                    _.extend(queuedChanges, changes);
                } else {
                    inFire = true;
                    try {
                        rules.fire(self, changes);
                    } finally {
                        inFire = false;
                    }

                    shouldFire = queueFire;
                    queueFire = false;
                    if (shouldFire) {
                        changes = queuedChanges;
                        queuedChanges = {};
                        fire(changes);
                    }
                }
            }

            this.fact = function (name, value) {
                if (value === undefined) {
                    return deep(facts, name);
                } else if (facts[name] !== value) {
                    var changes = {},
                        oldFacts = _.cloneDeep(facts);
                    deep(changes, name, value);
                    deep(facts, name, value);
                    try {
                        fire(changes);
                        this.notify('change', changes);
                        return true;
                    } catch (e) {
                        // if asserting a fact throws, reset state
                        facts = oldFacts;
                        this.facts = oldFacts;
                        throw e;
                    }
                }
                return false;
            };

            this.addEventListener = function (type, callback) {
                listeners[type].push(callback);
            };

            this.notify = function (type, arg) {
                _.each(listeners[type], function (callback) {
                    callback(self, arg);
                });
            };

            this.removeEventListener = function (type, callback) {
                var listener_list = listeners[type],
                    i = listener_list.indexOf(callback);
                if (i >= 0) {
                    listener_list.splice(i, 1);
                }
            };

            // if facts were passed into contructor, assert them
            if (options && options.facts) {
                _.each(options.facts, function (value, name) {
                    this.fact(name, value);
                }, this);
            }
        }

        function resolveLeft(engine, left) {
            return typeof(left) === 'function' ? left(engine) : engine.fact(left);
        }

        function resolveRight(engine, right) {
            return typeof(right) === 'function' ? right(engine) : right;
        }

        function condFn(fn, components) {
            var deps = [];
            _.each(components, function (component) {
                if (typeof(component) === 'function' && component.deps) {
                    deps = _.union(deps, component.deps);
                }
            });
            if (deps.length > 0) {
                fn.deps = deps;
            }
            return fn;
        }

        RulesEngine.fact = function (name) {
            var deps = [],
                nextPrefix,
                getFact = function (engine) {
                    return engine.fact(name);
                };

            _.each(name.split('.'), function (part) {
                var current = nextPrefix ? nextPrefix + '.' + part : part;
                deps.push(current);
                nextPrefix = current;
            });

            getFact.deps = deps;
            return getFact;
        };

        RulesEngine.setFact = function (name, value) {
            return function (engine) {
                engine.fact(name, value);
            };
        };

        var Conditions = {
            and: function () {
                var components = Array.prototype.slice.call(arguments);
                return condFn(function (engine) {
                    return _.all(components, function (fn) {
                        return fn(engine);
                    });
                }, components);
            },
            or: function () {
                var components = Array.prototype.slice.call(arguments);
                return condFn(function (engine) {
                    return _.any(components, function (fn) {
                        return fn(engine);
                    });
                }, components);
            },
            eq: function (fact, value) {
                return condFn(function (engine) {
                    return resolveLeft(engine, fact) === resolveRight(engine, value);
                }, [fact, value]);
            },
            neq: function (fact, value) {
                return condFn(function (engine) {
                    return resolveLeft(engine, fact) !== resolveRight(engine, value);
                }, [fact, value]);
            },
            gt: function (fact, value) {
                return condFn(function (engine) {
                    return resolveLeft(engine, fact) > resolveRight(engine, value);
                }, [fact, value]);
            },
            lt: function (fact, value) {
                return condFn(function (engine) {
                    return resolveLeft(engine, fact) < resolveRight(engine, value);
                }, [fact, value]);
            },
            gte: function (fact, value) {
                return condFn(function (engine) {
                    return resolveLeft(engine, fact) >= resolveRight(engine, value);
                }, [fact, value]);
            },
            lte: function (fact, value) {
                return condFn(function (engine) {
                    return resolveLeft(engine, fact) <= resolveRight(engine, value);
                }, [fact, value]);
            }
        };

        return {
            Rules: Rules,
            RulesEngine: RulesEngine,
            Conditions: Conditions
        };
    }

    if (typeof module !== 'undefined' && module.exports) { // nodejs
        var lodash = {
            cloneDeep: require('lodash-node/modern/objects/cloneDeep'),
            each: require('lodash-node/modern/collections/forEach'),
            all: require('lodash-node/modern/collections/every'),
            any: require('lodash-node/modern/collections/some'),
            extend: require('lodash-node/modern/objects/assign'),
            identity: require('lodash-node/modern/utilities/identity'),
            intersection: require('lodash-node/modern/arrays/intersection'),
            isArray: require('lodash-node/modern/objects/isArray'),
            isFunction: require('lodash-node/modern/objects/isFunction'),
            isObject: require('lodash-node/modern/objects/isObject'),
            keys: require('lodash-node/modern/objects/keys'),
            union: require('lodash-node/modern/arrays/union')
        };
        module.exports = declare(lodash);
    } else if (typeof define !== 'undefined' && define.amd) {
        define(['lodash'], declare);
    } else {
        window.FactsJS = declare(_);
    }
})();
