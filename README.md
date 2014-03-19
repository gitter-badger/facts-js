facts-js
========

FactsJS Javascript Rules Engine

## Installation & usage

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
var _ = require('facts');
```

In an AMD loader:

```js
require(['facts-js'], function(FactsJS) {

});
```

## Tests

grunt test