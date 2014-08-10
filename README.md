# rvc.js

[RequireJS](requirejs.org) supports *loader plugins*, which allow your AMD modules to specify dependencies that *aren't* AMD modules, by prefixing the path with the plugin name followed by `!`.

rvc is one such loader plugin, and it allows you to require component files.

If you're not sure what 'component files' are, [have a read of this](https://github.com/ractivejs/component-spec). If you're not familiar with RequireJS loader plugins, [there's some documentation here](http://requirejs.org/docs/api.html#plugins).


## Installation

To get `rvc.min.js` you can:

- Use CDN: `//cdn.jsdelivr.net/ractive.rvc/latest/rvc.min.js`.
- Use bower: `$ bower i rvc`.
- [Download the latest release](https://github.com/ractivejs/rvc/releases/).
- Clone the repo: `$ git clone https://github.com/ractivejs/rvc.git`.


## Usage

First, RequireJS needs to be able to find `rvc.js` and `ractive.js`. Either it should be in the root of your project (or whatever `baseUrl` is configured to be), or you'll need to set up the `paths` config (obviously, change the paths as appropriate):

```js
require.config({
  paths: {
    ractive: 'lib/ractive',
    rvc: 'plugins/rvc'
  }
});
```

Once RequireJS is configured, you can import components like so:

```js
// At the top-level of your app, e.g. inside your main.js file
require([ 'rvc!foo' ], function ( Foo ) {
  var ractive = new Foo({ /* ... */ });
});

// Inside a module
define([ 'rvc!foo' ], function ( Foo ) {
  var ractive = new Foo({ /* ... */ });
});
```

Note that the `.html` file extension is omitted - this is assumed.

Component paths work just like regular module paths, so they can be relative (`rvc!../foo`), or below an entry in the paths config:

```js
require.config({
  paths: {
    ractive: 'lib/ractive',
    rvc: 'plugins/rvc',
    ui: 'path/to/ractive_components'
  }
});

require([ 'rvc!ui/foo' ], function ( Foo ) {
  var ractive = new Foo({ /* ... */ });
});
```


## Optimisation

The great feature of RequireJS is that while you can develop your app without having to rebuild it every time you change a file, you can also bundle it into a single file for production using the [optimiser](http://requirejs.org/docs/optimization.html).

In addition to this 'inlining' of your components, rvc will parse your templates so that no additional computation needs to happen in the browser.

Once your project is optimised, you don't need the plugin itself, so add `rvc` to the `stubModules` option:

```js
// optimiser config
{
  paths: {
    ractive: 'lib/ractive',
    rvc: 'plugins/rvc'
  },
  stubModules: [ 'rvc' ]
}
```

Consult the [documentation](http://requirejs.org/docs/optimization.html) for more information on using the optimiser.


## License

MIT.
