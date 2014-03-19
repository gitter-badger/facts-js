facts-js
========

FactsJS Javascript Rules Engine

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
    rules: {
        name: 'x > 2',
        condition: FactsJS.Conditions.gt('x', 2),
        fire: FactsJS.RulesEngine.setFact('y', 10)
    }
});

engine = new FactsJS.RulesEngine({
    rules: rules,
    facts: {
        x: 1, y: 1
    }
});

engine.fact('x', 3);
// engine.facts.y == 10
```

## Tests

gulp test
