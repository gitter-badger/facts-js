# FactsJS -- JS Rules Engine

[![NPM](https://nodei.co/npm/facts-js.png?r=1)](https://nodei.co/npm/facts-js/)

[![Tests](https://ci.testling.com/hapyak/facts-js.png)](https://ci.testling.com/hapyak/facts-js)

## Installation

In browsers:

```html
<script src="facts.js"></script>
```

Using [`npm`](http://npmjs.org/):

```bash
npm i --save facts-js

{sudo} npm i -g facts-js
npm ln facts-js
```

In [Node.js](http://nodejs.org/) & [Ringo](http://ringojs.org/):

```js
var FactsJS = require('facts-js');
```

In an AMD loader:

```js
require(['facts'], function(FactsJS) {

});
```

## Usage

```js
var FactsJS = require('facts-js');

rules = new FactsJS.Rules({
    rules: [{
        name: 'x > 2',
        condition: FactsJS.Conditions.gt('x', 2),
        fire: FactsJS.RulesEngine.setFact('y', 10)
    }]
});

engine = new FactsJS.RulesEngine({
    rules: rules,
    facts: {
        x: 1, y: 1
    }
});

engine.fact('x', 3);
console.log(engine.fact('y')); // should print 10
```

## Running Tests

gulp test


## Dependencies

* [lodash](http://lodash.com/)
