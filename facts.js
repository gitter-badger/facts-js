/*global _:true*/
(function () {
    'use strict';

    function declare(_) {
        function Rules(options) {
            var rules = [],
                nextRuleId = 0;

            this.add = function (rule) {
                if (_.isArray(rule)) {
                    _.each(rule, this.add, this);
                } else {
                    rule.id = nextRuleId++;
                    rules.push(rule);
                    return this;
                }
            };

            this.fire = function (engine) {
                _.each(rules, function (rule) {
                    var result = rule.condition(engine.facts);
                    // only fire a rule if its condition result changes
                    if (result && result !== engine.state[rule.id]) {
                        rule.fire(engine);
                    }
                    engine.state[rule.id] = result;
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
                queueFire = false;

            this.facts = facts;
            this.state = state;

            function fire() {
                // if a rule fire asserts more facts, queue fire until all of the
                // current rules are processed.
                if (inFire) {
                    queueFire = true;
                } else {
                    inFire = true;
                    try {
                        rules.fire(self);
                    } finally {
                        inFire = false;
                    }

                    var shouldFire = queueFire;
                    queueFire = false;
                    if (shouldFire) {
                        fire();
                    }
                }
            }

            this.fact = function (name, value) {
                if (facts[name] !== value) {
                    var oldFacts = _.cloneDeep(facts);  // probably needs to be a deep clone
                    facts[name] = value;
                    try {
                        fire();
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

        RulesEngine.fact = function (name) {
            return function (facts) {
                return facts[name];
            };
        };

        RulesEngine.setFact = function (name, value) {
            return function (engine) {
                engine.fact(name, value);
            };
        };

        var Conditions = {
            and: function (f1, f2) {
                return function (facts) {
                    return f1(facts) && f2(facts);
                };
            },
            or: function (f1, f2) {
                return function (facts) {
                    return f1(facts) || f2(facts);
                };
            },
            eq: function (fact, value) {
                return function (facts) {
                    return resolveLeft(facts, fact) === resolveRight(facts, value);
                };
            },
            neq: function (fact, value) {
                return function (facts) {
                    return resolveLeft(facts, fact) !== resolveRight(facts, value);
                };
            },
            gt: function (fact, value) {
                return function (facts) {
                    return resolveLeft(facts, fact) > resolveRight(facts, value);
                };
            },
            lt: function (fact, value) {
                return function (facts) {
                    return resolveLeft(facts, fact) < resolveRight(facts, value);
                };
            },
            gte: function (fact, value) {
                return function (facts) {
                    return resolveLeft(facts, fact) >= resolveRight(facts, value);
                };
            },
            lte: function (fact, value) {
                return function (facts) {
                    return resolveLeft(facts, fact) <= resolveRight(facts, value);
                };
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
            cloneDeep: require('lodash-node/modern/objects/cloneDeep')
        };
        module.exports = declare(lodash);
    } else if (typeof define !== 'undefined' && define.amd) {
        define(['lodash'], declare);
    } else {
        window.FactsJS = declare(_);
    }
})();
