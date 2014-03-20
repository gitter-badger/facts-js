/*global _:true*/
(function () {
    'use strict';

    function declare(_) {
        function Rules(options) {
            var rules = [],
                nextRuleId = 0;

            function shouldEvaluateCondition(rule, changes) {
                // if a rule is dependent on a specific set of variables it doesn't
                // need to be run unless those variables have changed
                if (!rule.condition.deps) {
                    return true;
                } else {
                    return _.intersection(rule.condition.deps, _.keys(changes)).length > 0;
                }
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
                        var result = rule.condition(engine.facts);
                        // only fire a rule if its condition result changes
                        if (result && result !== engine.state[rule.id]) {
                            rule.fire(engine);
                        }
                        engine.state[rule.id] = result;
                    } else {
                        engine.statistics.ruleSkips++;
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
                facts = options && options.facts || {},
                rules = options.rules || new Rules(),
                state = {},
                inFire = false,
                queueFire = false,
                queuedChanges = {},
                statistics = {
                    ruleSkips: 0
                };

            this.facts = facts;
            this.state = state;
            this.statistics = statistics;

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
                if (facts[name] !== value) {
                    var changes = {},
                        oldFacts = _.cloneDeep(facts);  // probably needs to be a deep clone
                    changes[name] = value;
                    facts[name] = value;
                    try {
                        fire(changes);
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
        }

        function resolveLeft(facts, left) {
            return typeof(left) === 'function' ? left(facts) : facts[left];
        }

        function resolveRight(facts, right) {
            return typeof(right) === 'function' ? right(facts) : right;
        }

        function condFn(fn, left, right) {
            var deps = [];
            if (typeof(left) === 'function' && left.deps) {
                deps = _.union(deps, left.deps);
            }
            if (typeof(right) === 'function' && right.deps) {
                deps = _.union(deps, right.deps);
            }
            if (deps.length > 0) {
                fn.deps = deps;
            }
            return fn;
        }

        RulesEngine.fact = function (name) {
            var getFact = function (facts) {
                return facts[name];
            };
            getFact.deps = [name];
            return getFact;
        };

        RulesEngine.setFact = function (name, value) {
            return function (engine) {
                engine.fact(name, value);
            };
        };

        var Conditions = {
            and: function (f1, f2) {
                return condFn(function (facts) {
                    return f1(facts) && f2(facts);
                }, f1, f2);
            },
            or: function (f1, f2) {
                return condFn(function (facts) {
                    return f1(facts) || f2(facts);
                }, f1, f2);
            },
            eq: function (fact, value) {
                return condFn(function (facts) {
                    return resolveLeft(facts, fact) === resolveRight(facts, value);
                }, fact, value);
            },
            neq: function (fact, value) {
                return condFn(function (facts) {
                    return resolveLeft(facts, fact) !== resolveRight(facts, value);
                }, fact, value);
            },
            gt: function (fact, value) {
                return condFn(function (facts) {
                    return resolveLeft(facts, fact) > resolveRight(facts, value);
                }, fact, value);
            },
            lt: function (fact, value) {
                return condFn(function (facts) {
                    return resolveLeft(facts, fact) < resolveRight(facts, value);
                }, fact, value);
            },
            gte: function (fact, value) {
                return condFn(function (facts) {
                    return resolveLeft(facts, fact) >= resolveRight(facts, value);
                }, fact, value);
            },
            lte: function (fact, value) {
                return condFn(function (facts) {
                    return resolveLeft(facts, fact) <= resolveRight(facts, value);
                }, fact, value);
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
            each: require('lodash-node/modern/collections/forEach'),
            isArray: require('lodash-node/modern/objects/isArray'),
            keys: require('lodash-node/modern/objects/keys'),
            extend: require('lodash-node/modern/objects/assign'),
            cloneDeep: require('lodash-node/modern/objects/cloneDeep'),
            union: require('lodash-node/modern/arrays/union'),
            intersection: require('lodash-node/modern/arrays/intersection')
        };
        module.exports = declare(lodash);
    } else if (typeof define !== 'undefined' && define.amd) {
        define(['lodash'], declare);
    } else {
        window.FactsJS = declare(_);
    }
})();
