/*global describe,it,beforeEach*/
(function () {
    'use strict';

    var assert = require('assert'),
        FactsJS = require('./facts'),
        rules,
        engine;

    describe('FactsJS', function () {
        beforeEach(function () {
            rules = new FactsJS.Rules();
            engine = new FactsJS.RulesEngine({
                rules: rules,
                facts: {
                    x: 1,
                    y: 1
                }
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

        it('should initialize with facts for x and y', function () {
            assert.equal(engine.facts.x, 1);
            assert.equal(engine.facts.y, 1);
        });

        it('should set y to 10 when x>2 rule fires', function () {
            rules.add({
                name: 'x > 2',
                condition: FactsJS.Conditions.gt('x', 2),
                fire: FactsJS.RulesEngine.setFact('y', 10)
            });

            engine.fact('x', 2);
            assert.equal(engine.facts.x, 2, 'should not have changed');
            assert.equal(engine.facts.y, 1, 'should not have changed');
            engine.fact('x', 3);
            assert.equal(engine.facts.x, 3, 'should have changed since x is now > 3');
            assert.equal(engine.facts.y, 10, 'should have changed since x is now > 3');
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
                assert.equal(engine.facts.x, 1);
                assert.equal(engine.facts.y, 1);
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
                assert.equal(engine.facts.y, 10);
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
                rules.add({
                    name: 'x > 2',
                    condition: FactsJS.Conditions.gt(FactsJS.RulesEngine.fact('x'), 2),
                    fire: function () {
                    }
                });

                engine.fact('x', 3);
                assert.equal(engine.statistics.ruleSkips, 0);
                engine.fact('y', 3);
                assert.equal(engine.statistics.ruleSkips, 1, 'no rules depend on y');
            });
        });
    });
})();
