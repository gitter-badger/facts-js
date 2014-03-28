/*global describe,it,beforeEach*/
(function () {
    'use strict';

    var assert = require('assert'),
        FactsJS = require('./facts');

    function MockPromise(fn) {
        this.then = function (callback) {
            var result = fn();
            callback(result);
        };
    }

    describe('FactsJS#constructor', function () {
        it('should initialize with facts for x and y', function () {
            var rules = new FactsJS.Rules(),
                engine = new FactsJS.RulesEngine({
                    rules: rules,
                    facts: { x: 1, y: 1 }
                });
            assert.equal(engine.fact('x'), 1);
            assert.equal(engine.fact('y'), 1);
        });

        it('should fire rules against initial set of facts', function () {
            var rules = new FactsJS.Rules({
                    rules: [
                        {
                            name: 'x > 2',
                            condition: FactsJS.Conditions.gt('x', 2),
                            fire: FactsJS.RulesEngine.setFact('y', 10)
                        }
                    ]
                }),
                engine = new FactsJS.RulesEngine({
                    rules: rules,
                    facts: { x: 3 }
                });

            assert.equal(engine.fact('y'), 10);
        });
    });

    describe('FactsJS', function () {
        var rules, engine;

        beforeEach(function () {
            rules = new FactsJS.Rules();
            engine = new FactsJS.RulesEngine({
                rules: rules,
                facts: { x: 1, y: 1 }
            });
        });

        describe('And Conditions', function () {
            it('should collect all dependencies', function () {
                var anded = FactsJS.Conditions.and(
                    FactsJS.Conditions.gt(FactsJS.RulesEngine.fact('w'), FactsJS.RulesEngine.fact('x')),
                    FactsJS.Conditions.gt(FactsJS.RulesEngine.fact('y'), FactsJS.RulesEngine.fact('z'))
                );
                assert.deepEqual(anded.deps, ['w', 'x', 'y', 'z']);
            });
        });

        it('should set y to 10 when x>2 rule fires', function () {
            rules.add({
                name: 'x > 2',
                condition: FactsJS.Conditions.gt('x', 2),
                fire: FactsJS.RulesEngine.setFact('y', 10)
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
                    condition: FactsJS.Conditions.gt('x', 2),
                    fire: FactsJS.RulesEngine.setFact('y', 10)
                },
                {
                    name: 'y > 9',
                    condition: FactsJS.Conditions.gt('y', 9),
                    fire: FactsJS.RulesEngine.setFact('z', 20)
                }
            ]);

            engine.fact('x', 3);
            assert.equal(engine.facts.z, 20, 'should have set z since y > 9 now');
        });


        it('should restore state if a rule throws exception', function () {
            rules.add({
                name: 'x > 2',
                condition: FactsJS.Conditions.gt('x', 2),
                fire: function () {
                    throw new Error();
                }
            });

            rules.add({
                name: 'x > 10',
                condition: FactsJS.Conditions.gt('x', 10),
                fire: FactsJS.RulesEngine.setFact('y', 10)
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
                    condition: FactsJS.Conditions.gt(FactsJS.RulesEngine.fact('x'), 2),
                    fire: FactsJS.RulesEngine.setFact('y', 10)
                });

                engine.fact('x', 3);
                assert.equal(engine.fact('y'), 10);
            });

            it('should set z to 10 when x == y', function () {
                rules.add({
                    name: 'x > 2',
                    condition: FactsJS.Conditions.eq(FactsJS.RulesEngine.fact('x'), FactsJS.RulesEngine.fact('y')),
                    fire: FactsJS.RulesEngine.setFact('z', 10)
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
                    condition: FactsJS.Conditions.gt(FactsJS.RulesEngine.fact('x'), 2),
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

        describe('Using promises', function () {
            it('should set y to 10 when x>2 rule fires', function () {
                rules.add({
                    name: 'x > 2',
                    condition: function (facts) {
                        return new MockPromise(function () {
                            return facts.x > 2;
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
                        condition: FactsJS.Conditions.gt('x', 2),
                        fire: FactsJS.RulesEngine.setFact('y', 10)
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
