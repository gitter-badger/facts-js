/*global describe,it,beforeEach*/
(function () {
    'use strict';

    var assert = require('assert'),
        Rules = require('./facts').Rules,
        RulesEngine = require('./facts').RulesEngine,
        Conditions = require('./facts').Conditions;

    function MockPromise(fn) {
        this.then = function (callback) {
            var result = fn();
            callback(result);
        };
    }

    describe('FactsJS#constructor', function () {
        it('should initialize with facts for x and y', function () {
            var rules = new Rules(),
                engine = new RulesEngine({
                    rules: rules,
                    facts: { x: 1, y: 1 }
                });
            assert.equal(engine.fact('x'), 1);
            assert.equal(engine.fact('y'), 1);
        });

        it('should fire rules against initial set of facts', function () {
            var rules = new Rules({
                    rules: [
                        {
                            name: 'x > 2',
                            condition: Conditions.gt('x', 2),
                            fire: RulesEngine.setFact('y', 10)
                        }
                    ]
                }),
                engine = new RulesEngine({
                    rules: rules,
                    facts: { x: 3 }
                });

            assert.equal(engine.fact('y'), 10);
        });
    });

    describe('FactsJS', function () {
        var rules, engine;

        beforeEach(function () {
            rules = new Rules();
            engine = new RulesEngine({
                rules: rules,
                facts: { x: 1, y: 1 }
            });
        });

        describe('And Conditions', function () {
            it('should collect all dependencies', function () {
                var anded = Conditions.and(
                    Conditions.gt(RulesEngine.fact('u'), RulesEngine.fact('v')),
                    Conditions.gt(RulesEngine.fact('w'), RulesEngine.fact('x')),
                    Conditions.gt(RulesEngine.fact('y'), RulesEngine.fact('z'))
                );
                assert.deepEqual(anded.deps, ['u', 'v', 'w', 'x', 'y', 'z']);
            });

            it('should fire properly with anded condition', function () {
                rules.add({
                    name: 'x > 2',
                    condition: Conditions.and(Conditions.gt('x', 2), Conditions.lt('x', 4)),
                    fire: RulesEngine.setFact('y', 10)
                });

                engine.fact('x', 2);
                assert.equal(engine.fact('y'), 1, 'should not have changed');
                engine.fact('x', 4);
                assert.equal(engine.fact('y'), 1, 'should not have changed');
                engine.fact('x', 3);
                assert.equal(engine.fact('y'), 10);
            });
        });

        describe('Or Conditions', function () {
            beforeEach(function () {
                rules.add({
                    name: 'x > 2',
                    condition: Conditions.or(Conditions.eq('x', 3), Conditions.eq('x', 4)),
                    fire: RulesEngine.setFact('y', 10)
                });
            });

            it('should not fire when x = 2', function () {
                engine.fact('x', 2);
                assert.equal(engine.fact('y'), 1, 'should not have changed');
            });

            it('should fire when x = 3', function () {
                engine.fact('x', 3);
                assert.equal(engine.fact('y'), 10);
            });

            it('should fire when x = 4', function () {
                engine.fact('x', 4);
                assert.equal(engine.fact('y'), 10);
            });
        });

        it('should set y to 10 when x>2 rule fires', function () {
            rules.add({
                name: 'x > 2',
                condition: Conditions.gt('x', 2),
                fire: RulesEngine.setFact('y', 10)
            });

            engine.fact('x', 2);
            assert.equal(engine.fact('x'), 2, 'should not have changed');
            assert.equal(engine.fact('y'), 1, 'should not have changed');
            engine.fact('x', 3);
            assert.equal(engine.fact('x'), 3, 'should have changed since x is now > 3');
            assert.equal(engine.fact('y'), 10, 'should have changed since x is now > 3');
        });

        it('should fire multiple rules', function () {
            rules.add([
                {
                    name: 'x > 2',
                    condition: Conditions.gt('x', 2),
                    fire: RulesEngine.setFact('y', 10)
                },
                {
                    name: 'y > 9',
                    condition: Conditions.gt('y', 9),
                    fire: RulesEngine.setFact('z', 20)
                }
            ]);

            engine.fact('x', 3);
            assert.equal(engine.facts.z, 20, 'should have set z since y > 9 now');
        });

        it('should restore state if a rule throws exception', function () {
            rules.add({
                name: 'x > 2',
                condition: Conditions.gt('x', 2),
                fire: function () {
                    throw new Error();
                }
            });

            rules.add({
                name: 'x > 10',
                condition: Conditions.gt('x', 10),
                fire: RulesEngine.setFact('y', 10)
            });

            try {
                engine.fact('x', 10);
                assert.fail();
            } catch (e) {
                assert.equal(engine.fact('x'), 1);
                assert.equal(engine.fact('y'), 1);
            }
        });

        describe('Using FactsJS.RulesEngine.fact', function () {
            it('should set y to 10 when x>2 rule fires', function () {
                rules.add({
                    name: 'x > 2',
                    condition: Conditions.gt(RulesEngine.fact('x'), 2),
                    fire: RulesEngine.setFact('y', 10)
                });

                engine.fact('x', 3);
                assert.equal(engine.fact('y'), 10);
            });

            it('should set z to 10 when x == y', function () {
                rules.add({
                    name: 'x > 2',
                    condition: Conditions.eq(RulesEngine.fact('x'), RulesEngine.fact('y')),
                    fire: RulesEngine.setFact('z', 10)
                });

                engine.fact('x', 3);
                assert.equal(engine.facts.z, undefined);
                engine.fact('y', 3);
                assert.equal(engine.facts.z, 10);
            });

            it('should skip evaluating rule when condition doesnt watch that fact', function () {
                var processCount = 0;

                rules.add({
                    name: 'x > 2',
                    condition: Conditions.gt(RulesEngine.fact('x'), 2),
                    fire: function () {
                    }
                });

                engine.addEventListener('process', function () {
                    processCount++;
                });

                assert.equal(processCount, 0, 'starts at 0');
                engine.fact('x', 3);
                assert.equal(processCount, 1, 'increments b/c rule watches x');
                engine.fact('y', 3);
                assert.equal(processCount, 1, 'doesnt increment b/c nothing cares about y');
            });
        });

        describe('Using FactsJS.RulesEngine.fact with deep facts', function () {
            beforeEach(function () {
                engine.fact('d', { d1a: 2, d1b: { d2a: 3 }});
            });

            it('should allow deep gets', function () {
                assert.equal(engine.fact('d.d1a'), 2);
                assert.equal(engine.fact('d.d1b.d2a'), 3);
                assert.equal(engine.fact('d.d1b.d2b.d3a'), undefined);
            });

            it('should allow deep sets', function () {
                engine.fact('d.d1b.d2a', 4);
                assert.equal(engine.fact('d.d1b.d2a'), 4);

                engine.fact('d.d1b.d2c.d3a.d4a', 5);
                assert.equal(engine.fact('d.d1b.d2c.d3a.d4a'), 5);

                assert.equal(engine.fact('d.d1a'), 2);
            });

            it('should allow trees to be pruned', function () {
                engine.fact('d.d1b', false);
                assert.equal(engine.fact('d.d1b.d2a'), undefined);

                assert.equal(engine.fact('d.d1a'), 2);
            });

            it('should fire rules on deep facts', function () {
                rules.add([{
                    name: 'd.d1a > 3',
                    condition: Conditions.gt(RulesEngine.fact('d.d1a'), 3),
                    fire: RulesEngine.setFact('y', 10)
                }, {
                    name: 'd.d1a > 4',
                    condition: Conditions.gt(RulesEngine.fact('d.d1a'), 4),
                    fire: RulesEngine.setFact('d.d1b.d2a', 4)
                }]);

                engine.fact('d.d1a', 3);
                assert.equal(engine.fact('y'), 1);

                engine.fact('d.d1a', 4);
                assert.equal(engine.fact('y'), 10);

                engine.fact('d', {'d1a': 5});
                assert.equal(engine.fact('d.d1b.d2a'), 4);
            });

            it('should fire rules on deep pruning', function () {
                rules.add([{
                    name: 'd.d1b.d2a > 3',
                    condition: Conditions.gt(RulesEngine.fact('d.d1b.d2a'), 3),
                    fire: RulesEngine.setFact('d', false)
                }, {
                    name: 'd.d1b.d2a !== 10',
                    condition: Conditions.neq(RulesEngine.fact('d.d1b.d2a'), 10),
                    fire: RulesEngine.setFact('x', 8)
                }, {
                    name: 'd.d1a === 2',
                    condition: Conditions.eq(RulesEngine.fact('d.d1a'), 2),
                    fire: RulesEngine.setFact('y', 4)
                }]);

                engine.fact('d.d1b.d2a', 10);

                assert.equal(engine.fact('x'), 8);
                assert.equal(engine.fact('y'), 1);

                assert.equal(
                    !!engine.fact('d.d1b.d2a') && !!engine.fact('d.d1b') && !!engine.fact('d'),
                    false
                );
            });
        });

        describe('Using promises', function () {
            it('should set y to 10 when x>2 rule fires', function () {
                rules.add({
                    name: 'x > 2',
                    condition: function (engine) {
                        return new MockPromise(function () {
                            return engine.fact('x') > 2;
                        });
                    },
                    fire: function () {
                        engine.fact('y', 10);
                    }
                });

                engine.fact('x', 3);
                assert.equal(engine.fact('y'), 10);
            });
        });

        describe('Using listeners', function () {
            it('should fire change events when facts are added', function () {
                var numChanges = 0;

                rules.add([
                    {
                        name: 'x > 2',
                        condition: Conditions.gt('x', 2),
                        fire: RulesEngine.setFact('y', 10)
                    }
                ]);

                engine.addEventListener('change', function (engine, changes) {
                    if (changes.x) {
                        assert.equal(changes.x, 3);
                    } else if (changes.y) {
                        assert.equal(changes.y, 10);
                    } else {
                        assert.fail(changes, {}, 'change should have been x or y');
                    }
                    numChanges++;
                });

                engine.fact('x', 3);
                assert.equal(numChanges, 2, 'one change for x, one change for y');
            });
        });
    });
})();
