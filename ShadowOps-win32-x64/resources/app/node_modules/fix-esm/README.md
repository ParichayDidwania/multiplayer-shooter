# fix-esm

If you're here, you've probably run into this kind of error:

```
internal/modules/cjs/loader.js:1015
      throw new ERR_REQUIRE_ESM(filename, parentPath, packageJsonPath);
      ^

Error [ERR_REQUIRE_ESM]: Must use import to load ES Module: /home/user/projects/your-project/node_modules/some-module/lib/index.js
require() of ES modules is not supported.
require() of /home/user/projects/your-project/node_modules/some-module/lib/index.js from /home/user/projects/your-project/test-esm.js is an ES module file as it is a .js file whose nearest parent package.json contains "type": "module" which defines all .js files in that package scope as ES modules.
Instead rename index.js to end in .cjs, change the requiring code to use import(), or remove "type": "module" from /home/user/projects/your-project/node_modules/some-module/package.json.
```

__This module fixes that.__ [Some people](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c) will tell you that you need to switch to ESM to make it work, but unfortunately [ES Modules are actually pretty terrible](https://gist.github.com/joepie91/bca2fda868c1e8b2c2caf76af7dfcad3), as they do not support things like parametric modules, and they don't actually provide the benefits that many people claim they do. The resulting ecosystem split has unnecessarily caused a lot of misery for everybody.

So, instead, you can use this library to continue using CommonJS in your code, while also being able to use newer ESM releases of libraries! That means there's compatibility both ways again.

## How does it work?

Basically, it wraps the require function, detects an ESM import failure, and then uses Babel to do a *very limited* transpilation. It doesn't change any of the actual code (and so it shouldn't break anything), it only changes the import/export syntax to make it work with CommonJS.

Since the code only triggers when you hit an ESM import error, the impact on performance should be minimal - it's not like `@babel/register`, which would typically transpile *all* of your code.

## Is it reliable?

Probably. To be clear: this library uses a somewhat hacky approach, and it *might* break in the future. But since many people use Babel for browser code anyway, most every ESM module is going to work with Babel's module transforms, and so this should work fine too. The biggest risk is in Node's module system internals changing in such a way that it breaks the patching, but this is not that likely.

## How do I use it?

There are two main ways to use this library; either by using the custom `require` function it exports, or by setting it up globally.

### Custom require

First off, there's the 'custom require' approach. __This is the approach you should use when using `fix-esm` in a library you intend to publish!__ It's bad practice to publish libraries that modify things globally, and the 'custom require' approach ensures that you don't override anything global.

Simply change your `require` like this:

```js
// From...
const someModule = require("some-module");
// ... into ...
const someModule = require("fix-esm").require("some-module");
```

That's it! The `require` will now work.

### Global hook

If you're building an application, then it will probably be more practical to register a handler globally. You should do this __at the start of the entry point file__, such as your `app.js` or `server.js`, *before* loading any other modules, but *after* any other tools that set global require hooks (such as `@babel/register`).

Like so:

```js
require("fix-esm").register();

const someModule = require("some-module");
// More requires go here...
```

That's it! Now every `require` throughout your application will work, even with ESM modules.

## Something broken?

Please [file a bug](https://git.cryto.net/joepie91/fix-esm/issues)! This is an early release, and it's inherently hacky to some degree, so it's quite possible that it doesn't work under all circumstances yet.

When filing a bug, please make sure to include enough information to reproduce the issue - ideally, at least your Node version, operating system, and the contents of the file that is doing the `require`.

If it's more practical for you, you can also e-mail me with bug reports at [admin@cryto.net](mailto:admin@cryto.net).

## Changelog

### 1.0.1 (August 21, 2021)

- Fixed e-mail link in README.

### 1.0.0 (August 21, 2021)

Initial release.
