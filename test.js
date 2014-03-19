/*global require,module,describe,it,before,beforeEach*/
(function () {
    "use strict";

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
                    x: 1, y: 1
                }
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
    });
})();
