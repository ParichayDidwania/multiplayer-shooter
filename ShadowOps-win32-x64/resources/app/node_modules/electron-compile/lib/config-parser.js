'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createCompilerHostFromProjectRoot = exports.createCompilerHostFromConfigFile = exports.createCompilerHostFromBabelRc = undefined;

/**
 * Creates a compiler host from a .babelrc file. This method is usually called
 * from {@link createCompilerHostFromProjectRoot} instead of used directly.
 *
 * @param  {string} file  The path to a .babelrc file
 *
 * @param  {string} rootCacheDir (optional)  The directory to use as a cache.
 *
 * @return {Promise<CompilerHost>}  A set-up compiler host
 */
let createCompilerHostFromBabelRc = exports.createCompilerHostFromBabelRc = (() => {
  var _ref = _asyncToGenerator(function* (file) {
    let rootCacheDir = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    let sourceMapPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

    let info = JSON.parse((yield _promise.pfs.readFile(file, 'utf8')));

    // package.json
    if ('babel' in info) {
      info = info.babel;
    }

    if ('env' in info) {
      let ourEnv = process.env.BABEL_ENV || process.env.NODE_ENV || 'development';
      info = info.env[ourEnv];
    }

    // Are we still package.json (i.e. is there no babel info whatsoever?)
    if ('name' in info && 'version' in info) {
      let appRoot = _path2.default.dirname(file);
      return createCompilerHostFromConfiguration({
        appRoot: appRoot,
        options: getDefaultConfiguration(appRoot),
        rootCacheDir,
        sourceMapPath
      });
    }

    return createCompilerHostFromConfiguration({
      appRoot: _path2.default.dirname(file),
      options: {
        'application/javascript': info
      },
      rootCacheDir,
      sourceMapPath
    });
  });

  return function createCompilerHostFromBabelRc(_x5) {
    return _ref.apply(this, arguments);
  };
})();

/**
 * Creates a compiler host from a .compilerc file. This method is usually called
 * from {@link createCompilerHostFromProjectRoot} instead of used directly.
 *
 * @param  {string} file  The path to a .compilerc file
 *
 * @param  {string} rootCacheDir (optional)  The directory to use as a cache.
 *
 * @return {Promise<CompilerHost>}  A set-up compiler host
 */


let createCompilerHostFromConfigFile = exports.createCompilerHostFromConfigFile = (() => {
  var _ref2 = _asyncToGenerator(function* (file) {
    let rootCacheDir = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    let sourceMapPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

    let info = JSON.parse((yield _promise.pfs.readFile(file, 'utf8')));

    if ('env' in info) {
      let ourEnv = process.env.ELECTRON_COMPILE_ENV || process.env.NODE_ENV || 'development';
      info = info.env[ourEnv];
    }

    return createCompilerHostFromConfiguration({
      appRoot: _path2.default.dirname(file),
      options: info,
      rootCacheDir,
      sourceMapPath
    });
  });

  return function createCompilerHostFromConfigFile(_x8) {
    return _ref2.apply(this, arguments);
  };
})();

/**
 * Creates a configured {@link CompilerHost} instance from the project root
 * directory. This method first searches for a .compilerc (or .compilerc.json), then falls back to the
 * default locations for Babel configuration info. If neither are found, defaults
 * to standard settings
 *
 * @param  {string} rootDir  The root application directory (i.e. the directory
 *                           that has the app's package.json)
 *
 * @param  {string} rootCacheDir (optional)  The directory to use as a cache.
 *
 * @param {string} sourceMapPath (optional) The directory to store sourcemap separately
 *                               if compiler option enabled to emit.
 *
 * @return {Promise<CompilerHost>}  A set-up compiler host
 */


let createCompilerHostFromProjectRoot = exports.createCompilerHostFromProjectRoot = (() => {
  var _ref3 = _asyncToGenerator(function* (rootDir) {
    let rootCacheDir = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    let sourceMapPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

    let compilerc = _path2.default.join(rootDir, '.compilerc');
    if (statSyncNoException(compilerc)) {
      d(`Found a .compilerc at ${compilerc}, using it`);
      return yield createCompilerHostFromConfigFile(compilerc, rootCacheDir, sourceMapPath);
    }
    compilerc += '.json';
    if (statSyncNoException(compilerc)) {
      d(`Found a .compilerc at ${compilerc}, using it`);
      return yield createCompilerHostFromConfigFile(compilerc, rootCacheDir, sourceMapPath);
    }

    let babelrc = _path2.default.join(rootDir, '.babelrc');
    if (statSyncNoException(babelrc)) {
      d(`Found a .babelrc at ${babelrc}, using it`);
      return yield createCompilerHostFromBabelRc(babelrc, rootCacheDir, sourceMapPath);
    }

    d(`Using package.json or default parameters at ${rootDir}`);
    return yield createCompilerHostFromBabelRc(_path2.default.join(rootDir, 'package.json'), rootCacheDir, sourceMapPath);
  });

  return function createCompilerHostFromProjectRoot(_x11) {
    return _ref3.apply(this, arguments);
  };
})();

exports.initializeGlobalHooks = initializeGlobalHooks;
exports.init = init;
exports.createCompilerHostFromConfiguration = createCompilerHostFromConfiguration;
exports.createCompilerHostFromBabelRcSync = createCompilerHostFromBabelRcSync;
exports.createCompilerHostFromConfigFileSync = createCompilerHostFromConfigFileSync;
exports.createCompilerHostFromProjectRootSync = createCompilerHostFromProjectRootSync;
exports.calculateDefaultCompileCacheDirectory = calculateDefaultCompileCacheDirectory;
exports.getDefaultConfiguration = getDefaultConfiguration;
exports.createCompilers = createCompilers;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _zlib = require('zlib');

var _zlib2 = _interopRequireDefault(_zlib);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _promise = require('./promise');

var _fileChangeCache = require('./file-change-cache');

var _fileChangeCache2 = _interopRequireDefault(_fileChangeCache);

var _compilerHost = require('./compiler-host');

var _compilerHost2 = _interopRequireDefault(_compilerHost);

var _requireHook = require('./require-hook');

var _requireHook2 = _interopRequireDefault(_requireHook);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const d = require('debug')('electron-compile:config-parser');

// NB: We intentionally delay-load this so that in production, you can create
// cache-only versions of these compilers
let allCompilerClasses = null;

function statSyncNoException(fsPath) {
  if ('statSyncNoException' in _fs2.default) {
    return _fs2.default.statSyncNoException(fsPath);
  }

  try {
    return _fs2.default.statSync(fsPath);
  } catch (e) {
    return null;
  }
}

/**
 * Initialize the global hooks (protocol hook for file:, node.js hook)
 * independent of initializing the compiler. This method is usually called by
 * init instead of directly
 *
 * @param {CompilerHost} compilerHost  The compiler host to use.
 *
 */
function initializeGlobalHooks(compilerHost) {
  let isProduction = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  let globalVar = global || window;
  globalVar.globalCompilerHost = compilerHost;

  (0, _requireHook2.default)(compilerHost, isProduction);

  if ('type' in process && process.type === 'browser') {
    var _require = require('electron');

    const app = _require.app;

    var _require2 = require('./protocol-hook');

    const initializeProtocolHook = _require2.initializeProtocolHook;


    let protoify = function () {
      initializeProtocolHook(compilerHost);
    };
    if (app.isReady()) {
      protoify();
    } else {
      app.on('ready', protoify);
    }
  }
}

/**
 * Initialize electron-compile and set it up, either for development or
 * production use. This is almost always the only method you need to use in order
 * to use electron-compile.
 *
 * @param  {string} appRoot  The top-level directory for your application (i.e.
 *                           the one which has your package.json).
 *
 * @param  {string} mainModule  The module to require in, relative to the module
 *                              calling init, that will start your app. Write this
 *                              as if you were writing a require call from here.
 *
 * @param  {bool} productionMode   If explicitly True/False, will set read-only
 *                                 mode to be disabled/enabled. If not, we'll
 *                                 guess based on the presence of a production
 *                                 cache.
 *
 * @param  {string} cacheDir  If not passed in, read-only will look in
 *                            `appRoot/.cache` and dev mode will compile to a
 *                            temporary directory. If it is passed in, both modes
 *                            will cache to/from `appRoot/{cacheDir}`
 *
 * @param {string} sourceMapPath (optional) The directory to store sourcemap separately
 *                               if compiler option enabled to emit.
 *                               Default to cachePath if not specified, will be ignored for read-only mode.
 */
function init(appRoot, mainModule) {
  let productionMode = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
  let cacheDir = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
  let sourceMapPath = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;

  let compilerHost = null;
  let rootCacheDir = _path2.default.join(appRoot, cacheDir || '.cache');

  if (productionMode === null) {
    productionMode = !!statSyncNoException(rootCacheDir);
  }

  if (productionMode) {
    compilerHost = _compilerHost2.default.createReadonlyFromConfigurationSync(rootCacheDir, appRoot);
  } else {
    // if cacheDir was passed in, pass it along. Otherwise, default to a tempdir.
    const cachePath = cacheDir ? rootCacheDir : null;
    const mapPath = sourceMapPath ? _path2.default.join(appRoot, sourceMapPath) : cachePath;
    compilerHost = createCompilerHostFromProjectRootSync(appRoot, cachePath, mapPath);
  }

  initializeGlobalHooks(compilerHost, productionMode);
  require.main.require(mainModule);
}

/**
 * Creates a {@link CompilerHost} with the given information. This method is
 * usually called by {@link createCompilerHostFromProjectRoot}.
 *
 * @private
 */
function createCompilerHostFromConfiguration(info) {
  let compilers = createCompilers();
  let rootCacheDir = info.rootCacheDir || calculateDefaultCompileCacheDirectory();
  const sourceMapPath = info.sourceMapPath || info.rootCacheDir;

  if (info.sourceMapPath) {
    createSourceMapDirectory(sourceMapPath);
  }

  d(`Creating CompilerHost: ${JSON.stringify(info)}, rootCacheDir = ${rootCacheDir}, sourceMapPath = ${sourceMapPath}`);
  let fileChangeCache = new _fileChangeCache2.default(info.appRoot);

  let compilerInfo = _path2.default.join(rootCacheDir, 'compiler-info.json.gz');
  let json = {};
  if (_fs2.default.existsSync(compilerInfo)) {
    let buf = _fs2.default.readFileSync(compilerInfo);
    json = JSON.parse(_zlib2.default.gunzipSync(buf));
    fileChangeCache = _fileChangeCache2.default.loadFromData(json.fileChangeCache, info.appRoot, false);
  }

  Object.keys(info.options || {}).forEach(x => {
    let opts = info.options[x];
    if (!(x in compilers)) {
      throw new Error(`Found compiler settings for missing compiler: ${x}`);
    }

    // NB: Let's hope this isn't a valid compiler option...
    if (opts.passthrough) {
      compilers[x] = compilers['text/plain'];
      delete opts.passthrough;
    }

    d(`Setting options for ${x}: ${JSON.stringify(opts)}`);
    compilers[x].compilerOptions = opts;
  });

  let ret = new _compilerHost2.default(rootCacheDir, compilers, fileChangeCache, false, compilers['text/plain'], null, json.mimeTypesToRegister);

  // NB: It's super important that we guarantee that the configuration is saved
  // out, because we'll need to re-read it in the renderer process
  d(`Created compiler host with options: ${JSON.stringify(info)}`);
  ret.saveConfigurationSync();
  return ret;
}function createCompilerHostFromBabelRcSync(file) {
  let rootCacheDir = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  let sourceMapPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  let info = JSON.parse(_fs2.default.readFileSync(file, 'utf8'));

  // package.json
  if ('babel' in info) {
    info = info.babel;
  }

  if ('env' in info) {
    let ourEnv = process.env.BABEL_ENV || process.env.NODE_ENV || 'development';
    info = info.env[ourEnv];
  }

  // Are we still package.json (i.e. is there no babel info whatsoever?)
  if ('name' in info && 'version' in info) {
    let appRoot = _path2.default.dirname(file);
    return createCompilerHostFromConfiguration({
      appRoot: appRoot,
      options: getDefaultConfiguration(appRoot),
      rootCacheDir,
      sourceMapPath
    });
  }

  return createCompilerHostFromConfiguration({
    appRoot: _path2.default.dirname(file),
    options: {
      'application/javascript': info
    },
    rootCacheDir,
    sourceMapPath
  });
}

function createCompilerHostFromConfigFileSync(file) {
  let rootCacheDir = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  let sourceMapPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  let info = JSON.parse(_fs2.default.readFileSync(file, 'utf8'));

  if ('env' in info) {
    let ourEnv = process.env.ELECTRON_COMPILE_ENV || process.env.NODE_ENV || 'development';
    info = info.env[ourEnv];
  }

  return createCompilerHostFromConfiguration({
    appRoot: _path2.default.dirname(file),
    options: info,
    rootCacheDir,
    sourceMapPath
  });
}

function createCompilerHostFromProjectRootSync(rootDir) {
  let rootCacheDir = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  let sourceMapPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  let compilerc = _path2.default.join(rootDir, '.compilerc');
  if (statSyncNoException(compilerc)) {
    d(`Found a .compilerc at ${compilerc}, using it`);
    return createCompilerHostFromConfigFileSync(compilerc, rootCacheDir, sourceMapPath);
  }

  let babelrc = _path2.default.join(rootDir, '.babelrc');
  if (statSyncNoException(babelrc)) {
    d(`Found a .babelrc at ${babelrc}, using it`);
    return createCompilerHostFromBabelRcSync(babelrc, rootCacheDir, sourceMapPath);
  }

  d(`Using package.json or default parameters at ${rootDir}`);
  return createCompilerHostFromBabelRcSync(_path2.default.join(rootDir, 'package.json'), rootCacheDir, sourceMapPath);
}

/**
 * Returns what electron-compile would use as a default rootCacheDir. Usually only
 * used for debugging purposes
 *
 * @return {string}  A path that may or may not exist where electron-compile would
 *                   set up a development mode cache.
 */
function calculateDefaultCompileCacheDirectory() {
  let tmpDir = process.env.TEMP || process.env.TMPDIR || '/tmp';
  let hash = require('crypto').createHash('md5').update(process.execPath).digest('hex');

  let cacheDir = _path2.default.join(tmpDir, `compileCache_${hash}`);
  _mkdirp2.default.sync(cacheDir);

  d(`Using default cache directory: ${cacheDir}`);
  return cacheDir;
}

function createSourceMapDirectory(sourceMapPath) {
  _mkdirp2.default.sync(sourceMapPath);
  d(`Using separate sourcemap path at ${sourceMapPath}`);
}

function getElectronVersion(rootDir) {
  if (process.versions.electron) {
    return process.versions.electron;
  }

  let ourPkgJson = require(_path2.default.join(rootDir, 'package.json'));

  let version = ['electron-prebuilt-compile', 'electron'].map(mod => {
    if (ourPkgJson.devDependencies && ourPkgJson.devDependencies[mod]) {
      // NB: lol this code
      let verRange = ourPkgJson.devDependencies[mod];
      let m = verRange.match(/(\d+\.\d+\.\d+)/);
      if (m && m[1]) return m[1];
    }

    try {
      return process.mainModule.require(`${mod}/package.json`).version;
    } catch (e) {
      // NB: This usually doesn't work, but sometimes maybe?
    }

    try {
      let p = _path2.default.join(rootDir, mod, 'package.json');
      return require(p).version;
    } catch (e) {
      return null;
    }
  }).find(x => !!x);

  if (!version) {
    throw new Error("Can't automatically discover the version of Electron, you probably need a .compilerc file");
  }

  return version;
}

/**
 * Returns the default .configrc if no configuration information can be found.
 *
 * @return {Object}  A list of default config settings for electron-compiler.
 */
function getDefaultConfiguration(rootDir) {
  return {
    'application/javascript': {
      "presets": [["env", {
        "targets": {
          "electron": getElectronVersion(rootDir)
        }
      }], "react"],
      "sourceMaps": "inline"
    }
  };
}

/**
 * Allows you to create new instances of all compilers that are supported by
 * electron-compile and use them directly. Currently supports Babel, CoffeeScript,
 * TypeScript, Less, and Jade.
 *
 * @return {Object}  An Object whose Keys are MIME types, and whose values
 * are instances of @{link CompilerBase}.
 */
function createCompilers() {
  if (!allCompilerClasses) {
    // First we want to see if electron-compilers itself has been installed with
    // devDependencies. If that's not the case, check to see if
    // electron-compilers is installed as a peer dependency (probably as a
    // devDependency of the root project).
    const locations = ['electron-compilers', '../../electron-compilers'];

    for (let location of locations) {
      try {
        allCompilerClasses = require(location);
      } catch (e) {
        // Yolo
      }
    }

    if (!allCompilerClasses) {
      throw new Error("Electron compilers not found but were requested to be loaded");
    }
  }

  // NB: Note that this code is carefully set up so that InlineHtmlCompiler
  // (i.e. classes with `createFromCompilers`) initially get an empty object,
  // but will have a reference to the final result of what we return, which
  // resolves the circular dependency we'd otherwise have here.
  let ret = {};
  let instantiatedClasses = allCompilerClasses.map(Klass => {
    if ('createFromCompilers' in Klass) {
      return Klass.createFromCompilers(ret);
    } else {
      return new Klass();
    }
  });

  instantiatedClasses.reduce((acc, x) => {
    let Klass = Object.getPrototypeOf(x).constructor;

    for (let type of Klass.getInputMimeTypes()) {
      acc[type] = x;
    }
    return acc;
  }, ret);

  return ret;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jb25maWctcGFyc2VyLmpzIl0sIm5hbWVzIjpbImZpbGUiLCJyb290Q2FjaGVEaXIiLCJzb3VyY2VNYXBQYXRoIiwiaW5mbyIsIkpTT04iLCJwYXJzZSIsInBmcyIsInJlYWRGaWxlIiwiYmFiZWwiLCJvdXJFbnYiLCJwcm9jZXNzIiwiZW52IiwiQkFCRUxfRU5WIiwiTk9ERV9FTlYiLCJhcHBSb290IiwicGF0aCIsImRpcm5hbWUiLCJjcmVhdGVDb21waWxlckhvc3RGcm9tQ29uZmlndXJhdGlvbiIsIm9wdGlvbnMiLCJnZXREZWZhdWx0Q29uZmlndXJhdGlvbiIsImNyZWF0ZUNvbXBpbGVySG9zdEZyb21CYWJlbFJjIiwiRUxFQ1RST05fQ09NUElMRV9FTlYiLCJjcmVhdGVDb21waWxlckhvc3RGcm9tQ29uZmlnRmlsZSIsInJvb3REaXIiLCJjb21waWxlcmMiLCJqb2luIiwic3RhdFN5bmNOb0V4Y2VwdGlvbiIsImQiLCJiYWJlbHJjIiwiY3JlYXRlQ29tcGlsZXJIb3N0RnJvbVByb2plY3RSb290IiwiaW5pdGlhbGl6ZUdsb2JhbEhvb2tzIiwiaW5pdCIsImNyZWF0ZUNvbXBpbGVySG9zdEZyb21CYWJlbFJjU3luYyIsImNyZWF0ZUNvbXBpbGVySG9zdEZyb21Db25maWdGaWxlU3luYyIsImNyZWF0ZUNvbXBpbGVySG9zdEZyb21Qcm9qZWN0Um9vdFN5bmMiLCJjYWxjdWxhdGVEZWZhdWx0Q29tcGlsZUNhY2hlRGlyZWN0b3J5IiwiY3JlYXRlQ29tcGlsZXJzIiwicmVxdWlyZSIsImFsbENvbXBpbGVyQ2xhc3NlcyIsImZzUGF0aCIsImZzIiwic3RhdFN5bmMiLCJlIiwiY29tcGlsZXJIb3N0IiwiaXNQcm9kdWN0aW9uIiwiZ2xvYmFsVmFyIiwiZ2xvYmFsIiwid2luZG93IiwiZ2xvYmFsQ29tcGlsZXJIb3N0IiwidHlwZSIsImFwcCIsImluaXRpYWxpemVQcm90b2NvbEhvb2siLCJwcm90b2lmeSIsImlzUmVhZHkiLCJvbiIsIm1haW5Nb2R1bGUiLCJwcm9kdWN0aW9uTW9kZSIsImNhY2hlRGlyIiwiQ29tcGlsZXJIb3N0IiwiY3JlYXRlUmVhZG9ubHlGcm9tQ29uZmlndXJhdGlvblN5bmMiLCJjYWNoZVBhdGgiLCJtYXBQYXRoIiwibWFpbiIsImNvbXBpbGVycyIsImNyZWF0ZVNvdXJjZU1hcERpcmVjdG9yeSIsInN0cmluZ2lmeSIsImZpbGVDaGFuZ2VDYWNoZSIsIkZpbGVDaGFuZ2VkQ2FjaGUiLCJjb21waWxlckluZm8iLCJqc29uIiwiZXhpc3RzU3luYyIsImJ1ZiIsInJlYWRGaWxlU3luYyIsInpsaWIiLCJndW56aXBTeW5jIiwibG9hZEZyb21EYXRhIiwiT2JqZWN0Iiwia2V5cyIsImZvckVhY2giLCJ4Iiwib3B0cyIsIkVycm9yIiwicGFzc3Rocm91Z2giLCJjb21waWxlck9wdGlvbnMiLCJyZXQiLCJtaW1lVHlwZXNUb1JlZ2lzdGVyIiwic2F2ZUNvbmZpZ3VyYXRpb25TeW5jIiwidG1wRGlyIiwiVEVNUCIsIlRNUERJUiIsImhhc2giLCJjcmVhdGVIYXNoIiwidXBkYXRlIiwiZXhlY1BhdGgiLCJkaWdlc3QiLCJta2RpcnAiLCJzeW5jIiwiZ2V0RWxlY3Ryb25WZXJzaW9uIiwidmVyc2lvbnMiLCJlbGVjdHJvbiIsIm91clBrZ0pzb24iLCJ2ZXJzaW9uIiwibWFwIiwibW9kIiwiZGV2RGVwZW5kZW5jaWVzIiwidmVyUmFuZ2UiLCJtIiwibWF0Y2giLCJwIiwiZmluZCIsImxvY2F0aW9ucyIsImxvY2F0aW9uIiwiaW5zdGFudGlhdGVkQ2xhc3NlcyIsIktsYXNzIiwiY3JlYXRlRnJvbUNvbXBpbGVycyIsInJlZHVjZSIsImFjYyIsImdldFByb3RvdHlwZU9mIiwiY29uc3RydWN0b3IiLCJnZXRJbnB1dE1pbWVUeXBlcyJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQTRKQTs7Ozs7Ozs7Ozs7K0JBVU8sV0FBNkNBLElBQTdDLEVBQTRGO0FBQUEsUUFBekNDLFlBQXlDLHVFQUE1QixJQUE0QjtBQUFBLFFBQXRCQyxhQUFzQix1RUFB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QUFDQTtBQUNBLE1BQUlHLE1BQU0sRUFBVjtBQUNBLE1BQUk0QixzQkFBc0IxRSxtQkFBbUJnRSxHQUFuQixDQUF3QlcsS0FBRCxJQUFXO0FBQzFELFFBQUkseUJBQXlCQSxLQUE3QixFQUFvQztBQUNsQyxhQUFPQSxNQUFNQyxtQkFBTixDQUEwQjlCLEdBQTFCLENBQVA7QUFDRCxLQUZELE1BRU87QUFDTCxhQUFPLElBQUk2QixLQUFKLEVBQVA7QUFDRDtBQUNGLEdBTnlCLENBQTFCOztBQVFBRCxzQkFBb0JHLE1BQXBCLENBQTJCLENBQUNDLEdBQUQsRUFBS3JDLENBQUwsS0FBVztBQUNwQyxRQUFJa0MsUUFBUXJDLE9BQU95QyxjQUFQLENBQXNCdEMsQ0FBdEIsRUFBeUJ1QyxXQUFyQzs7QUFFQSxTQUFLLElBQUlyRSxJQUFULElBQWlCZ0UsTUFBTU0saUJBQU4sRUFBakIsRUFBNEM7QUFBRUgsVUFBSW5FLElBQUosSUFBWThCLENBQVo7QUFBZ0I7QUFDOUQsV0FBT3FDLEdBQVA7QUFDRCxHQUxELEVBS0doQyxHQUxIOztBQU9BLFNBQU9BLEdBQVA7QUFDRCIsImZpbGUiOiJjb25maWctcGFyc2VyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHpsaWIgZnJvbSAnemxpYic7XG5pbXBvcnQgbWtkaXJwIGZyb20gJ21rZGlycCc7XG5pbXBvcnQge3Bmc30gZnJvbSAnLi9wcm9taXNlJztcblxuaW1wb3J0IEZpbGVDaGFuZ2VkQ2FjaGUgZnJvbSAnLi9maWxlLWNoYW5nZS1jYWNoZSc7XG5pbXBvcnQgQ29tcGlsZXJIb3N0IGZyb20gJy4vY29tcGlsZXItaG9zdCc7XG5pbXBvcnQgcmVnaXN0ZXJSZXF1aXJlRXh0ZW5zaW9uIGZyb20gJy4vcmVxdWlyZS1ob29rJztcblxuY29uc3QgZCA9IHJlcXVpcmUoJ2RlYnVnJykoJ2VsZWN0cm9uLWNvbXBpbGU6Y29uZmlnLXBhcnNlcicpO1xuXG4vLyBOQjogV2UgaW50ZW50aW9uYWxseSBkZWxheS1sb2FkIHRoaXMgc28gdGhhdCBpbiBwcm9kdWN0aW9uLCB5b3UgY2FuIGNyZWF0ZVxuLy8gY2FjaGUtb25seSB2ZXJzaW9ucyBvZiB0aGVzZSBjb21waWxlcnNcbmxldCBhbGxDb21waWxlckNsYXNzZXMgPSBudWxsO1xuXG5mdW5jdGlvbiBzdGF0U3luY05vRXhjZXB0aW9uKGZzUGF0aCkge1xuICBpZiAoJ3N0YXRTeW5jTm9FeGNlcHRpb24nIGluIGZzKSB7XG4gICAgcmV0dXJuIGZzLnN0YXRTeW5jTm9FeGNlcHRpb24oZnNQYXRoKTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgcmV0dXJuIGZzLnN0YXRTeW5jKGZzUGF0aCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5cbi8qKlxuICogSW5pdGlhbGl6ZSB0aGUgZ2xvYmFsIGhvb2tzIChwcm90b2NvbCBob29rIGZvciBmaWxlOiwgbm9kZS5qcyBob29rKVxuICogaW5kZXBlbmRlbnQgb2YgaW5pdGlhbGl6aW5nIHRoZSBjb21waWxlci4gVGhpcyBtZXRob2QgaXMgdXN1YWxseSBjYWxsZWQgYnlcbiAqIGluaXQgaW5zdGVhZCBvZiBkaXJlY3RseVxuICpcbiAqIEBwYXJhbSB7Q29tcGlsZXJIb3N0fSBjb21waWxlckhvc3QgIFRoZSBjb21waWxlciBob3N0IHRvIHVzZS5cbiAqXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbml0aWFsaXplR2xvYmFsSG9va3MoY29tcGlsZXJIb3N0LCBpc1Byb2R1Y3Rpb249ZmFsc2UpIHtcbiAgbGV0IGdsb2JhbFZhciA9IChnbG9iYWwgfHwgd2luZG93KTtcbiAgZ2xvYmFsVmFyLmdsb2JhbENvbXBpbGVySG9zdCA9IGNvbXBpbGVySG9zdDtcblxuICByZWdpc3RlclJlcXVpcmVFeHRlbnNpb24oY29tcGlsZXJIb3N0LCBpc1Byb2R1Y3Rpb24pO1xuXG4gIGlmICgndHlwZScgaW4gcHJvY2VzcyAmJiBwcm9jZXNzLnR5cGUgPT09ICdicm93c2VyJykge1xuICAgIGNvbnN0IHsgYXBwIH0gPSByZXF1aXJlKCdlbGVjdHJvbicpO1xuICAgIGNvbnN0IHsgaW5pdGlhbGl6ZVByb3RvY29sSG9vayB9ID0gcmVxdWlyZSgnLi9wcm90b2NvbC1ob29rJyk7XG5cbiAgICBsZXQgcHJvdG9pZnkgPSBmdW5jdGlvbigpIHsgaW5pdGlhbGl6ZVByb3RvY29sSG9vayhjb21waWxlckhvc3QpOyB9O1xuICAgIGlmIChhcHAuaXNSZWFkeSgpKSB7XG4gICAgICBwcm90b2lmeSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhcHAub24oJ3JlYWR5JywgcHJvdG9pZnkpO1xuICAgIH1cbiAgfVxufVxuXG5cbi8qKlxuICogSW5pdGlhbGl6ZSBlbGVjdHJvbi1jb21waWxlIGFuZCBzZXQgaXQgdXAsIGVpdGhlciBmb3IgZGV2ZWxvcG1lbnQgb3JcbiAqIHByb2R1Y3Rpb24gdXNlLiBUaGlzIGlzIGFsbW9zdCBhbHdheXMgdGhlIG9ubHkgbWV0aG9kIHlvdSBuZWVkIHRvIHVzZSBpbiBvcmRlclxuICogdG8gdXNlIGVsZWN0cm9uLWNvbXBpbGUuXG4gKlxuICogQHBhcmFtICB7c3RyaW5nfSBhcHBSb290ICBUaGUgdG9wLWxldmVsIGRpcmVjdG9yeSBmb3IgeW91ciBhcHBsaWNhdGlvbiAoaS5lLlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICB0aGUgb25lIHdoaWNoIGhhcyB5b3VyIHBhY2thZ2UuanNvbikuXG4gKlxuICogQHBhcmFtICB7c3RyaW5nfSBtYWluTW9kdWxlICBUaGUgbW9kdWxlIHRvIHJlcXVpcmUgaW4sIHJlbGF0aXZlIHRvIHRoZSBtb2R1bGVcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGluZyBpbml0LCB0aGF0IHdpbGwgc3RhcnQgeW91ciBhcHAuIFdyaXRlIHRoaXNcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXMgaWYgeW91IHdlcmUgd3JpdGluZyBhIHJlcXVpcmUgY2FsbCBmcm9tIGhlcmUuXG4gKlxuICogQHBhcmFtICB7Ym9vbH0gcHJvZHVjdGlvbk1vZGUgICBJZiBleHBsaWNpdGx5IFRydWUvRmFsc2UsIHdpbGwgc2V0IHJlYWQtb25seVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtb2RlIHRvIGJlIGRpc2FibGVkL2VuYWJsZWQuIElmIG5vdCwgd2UnbGxcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ3Vlc3MgYmFzZWQgb24gdGhlIHByZXNlbmNlIG9mIGEgcHJvZHVjdGlvblxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWNoZS5cbiAqXG4gKiBAcGFyYW0gIHtzdHJpbmd9IGNhY2hlRGlyICBJZiBub3QgcGFzc2VkIGluLCByZWFkLW9ubHkgd2lsbCBsb29rIGluXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICBgYXBwUm9vdC8uY2FjaGVgIGFuZCBkZXYgbW9kZSB3aWxsIGNvbXBpbGUgdG8gYVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcG9yYXJ5IGRpcmVjdG9yeS4gSWYgaXQgaXMgcGFzc2VkIGluLCBib3RoIG1vZGVzXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWxsIGNhY2hlIHRvL2Zyb20gYGFwcFJvb3Qve2NhY2hlRGlyfWBcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gc291cmNlTWFwUGF0aCAob3B0aW9uYWwpIFRoZSBkaXJlY3RvcnkgdG8gc3RvcmUgc291cmNlbWFwIHNlcGFyYXRlbHlcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIGNvbXBpbGVyIG9wdGlvbiBlbmFibGVkIHRvIGVtaXQuXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBEZWZhdWx0IHRvIGNhY2hlUGF0aCBpZiBub3Qgc3BlY2lmaWVkLCB3aWxsIGJlIGlnbm9yZWQgZm9yIHJlYWQtb25seSBtb2RlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5pdChhcHBSb290LCBtYWluTW9kdWxlLCBwcm9kdWN0aW9uTW9kZSA9IG51bGwsIGNhY2hlRGlyID0gbnVsbCwgc291cmNlTWFwUGF0aCA9IG51bGwpIHtcbiAgbGV0IGNvbXBpbGVySG9zdCA9IG51bGw7XG4gIGxldCByb290Q2FjaGVEaXIgPSBwYXRoLmpvaW4oYXBwUm9vdCwgY2FjaGVEaXIgfHwgJy5jYWNoZScpO1xuXG4gIGlmIChwcm9kdWN0aW9uTW9kZSA9PT0gbnVsbCkge1xuICAgIHByb2R1Y3Rpb25Nb2RlID0gISFzdGF0U3luY05vRXhjZXB0aW9uKHJvb3RDYWNoZURpcik7XG4gIH1cblxuICBpZiAocHJvZHVjdGlvbk1vZGUpIHtcbiAgICBjb21waWxlckhvc3QgPSBDb21waWxlckhvc3QuY3JlYXRlUmVhZG9ubHlGcm9tQ29uZmlndXJhdGlvblN5bmMocm9vdENhY2hlRGlyLCBhcHBSb290KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBpZiBjYWNoZURpciB3YXMgcGFzc2VkIGluLCBwYXNzIGl0IGFsb25nLiBPdGhlcndpc2UsIGRlZmF1bHQgdG8gYSB0ZW1wZGlyLlxuICAgIGNvbnN0IGNhY2hlUGF0aCA9IGNhY2hlRGlyID8gcm9vdENhY2hlRGlyIDogbnVsbDtcbiAgICBjb25zdCBtYXBQYXRoID0gc291cmNlTWFwUGF0aCA/IHBhdGguam9pbihhcHBSb290LCBzb3VyY2VNYXBQYXRoKSA6IGNhY2hlUGF0aDtcbiAgICBjb21waWxlckhvc3QgPSBjcmVhdGVDb21waWxlckhvc3RGcm9tUHJvamVjdFJvb3RTeW5jKGFwcFJvb3QsIGNhY2hlUGF0aCwgbWFwUGF0aCk7XG4gIH1cblxuICBpbml0aWFsaXplR2xvYmFsSG9va3MoY29tcGlsZXJIb3N0LCBwcm9kdWN0aW9uTW9kZSk7XG4gIHJlcXVpcmUubWFpbi5yZXF1aXJlKG1haW5Nb2R1bGUpO1xufVxuXG5cbi8qKlxuICogQ3JlYXRlcyBhIHtAbGluayBDb21waWxlckhvc3R9IHdpdGggdGhlIGdpdmVuIGluZm9ybWF0aW9uLiBUaGlzIG1ldGhvZCBpc1xuICogdXN1YWxseSBjYWxsZWQgYnkge0BsaW5rIGNyZWF0ZUNvbXBpbGVySG9zdEZyb21Qcm9qZWN0Um9vdH0uXG4gKlxuICogQHByaXZhdGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNvbXBpbGVySG9zdEZyb21Db25maWd1cmF0aW9uKGluZm8pIHtcbiAgbGV0IGNvbXBpbGVycyA9IGNyZWF0ZUNvbXBpbGVycygpO1xuICBsZXQgcm9vdENhY2hlRGlyID0gaW5mby5yb290Q2FjaGVEaXIgfHwgY2FsY3VsYXRlRGVmYXVsdENvbXBpbGVDYWNoZURpcmVjdG9yeSgpO1xuICBjb25zdCBzb3VyY2VNYXBQYXRoID0gaW5mby5zb3VyY2VNYXBQYXRoIHx8IGluZm8ucm9vdENhY2hlRGlyO1xuXG4gIGlmIChpbmZvLnNvdXJjZU1hcFBhdGgpIHtcbiAgICBjcmVhdGVTb3VyY2VNYXBEaXJlY3Rvcnkoc291cmNlTWFwUGF0aCk7XG4gIH1cblxuICBkKGBDcmVhdGluZyBDb21waWxlckhvc3Q6ICR7SlNPTi5zdHJpbmdpZnkoaW5mbyl9LCByb290Q2FjaGVEaXIgPSAke3Jvb3RDYWNoZURpcn0sIHNvdXJjZU1hcFBhdGggPSAke3NvdXJjZU1hcFBhdGh9YCk7XG4gIGxldCBmaWxlQ2hhbmdlQ2FjaGUgPSBuZXcgRmlsZUNoYW5nZWRDYWNoZShpbmZvLmFwcFJvb3QpO1xuXG4gIGxldCBjb21waWxlckluZm8gPSBwYXRoLmpvaW4ocm9vdENhY2hlRGlyLCAnY29tcGlsZXItaW5mby5qc29uLmd6Jyk7XG4gIGxldCBqc29uID0ge307XG4gIGlmIChmcy5leGlzdHNTeW5jKGNvbXBpbGVySW5mbykpIHtcbiAgICBsZXQgYnVmID0gZnMucmVhZEZpbGVTeW5jKGNvbXBpbGVySW5mbyk7XG4gICAganNvbiA9IEpTT04ucGFyc2UoemxpYi5ndW56aXBTeW5jKGJ1ZikpO1xuICAgIGZpbGVDaGFuZ2VDYWNoZSA9IEZpbGVDaGFuZ2VkQ2FjaGUubG9hZEZyb21EYXRhKGpzb24uZmlsZUNoYW5nZUNhY2hlLCBpbmZvLmFwcFJvb3QsIGZhbHNlKTtcbiAgfVxuXG4gIE9iamVjdC5rZXlzKGluZm8ub3B0aW9ucyB8fCB7fSkuZm9yRWFjaCgoeCkgPT4ge1xuICAgIGxldCBvcHRzID0gaW5mby5vcHRpb25zW3hdO1xuICAgIGlmICghKHggaW4gY29tcGlsZXJzKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGb3VuZCBjb21waWxlciBzZXR0aW5ncyBmb3IgbWlzc2luZyBjb21waWxlcjogJHt4fWApO1xuICAgIH1cblxuICAgIC8vIE5COiBMZXQncyBob3BlIHRoaXMgaXNuJ3QgYSB2YWxpZCBjb21waWxlciBvcHRpb24uLi5cbiAgICBpZiAob3B0cy5wYXNzdGhyb3VnaCkge1xuICAgICAgY29tcGlsZXJzW3hdID0gY29tcGlsZXJzWyd0ZXh0L3BsYWluJ107XG4gICAgICBkZWxldGUgb3B0cy5wYXNzdGhyb3VnaDtcbiAgICB9XG5cbiAgICBkKGBTZXR0aW5nIG9wdGlvbnMgZm9yICR7eH06ICR7SlNPTi5zdHJpbmdpZnkob3B0cyl9YCk7XG4gICAgY29tcGlsZXJzW3hdLmNvbXBpbGVyT3B0aW9ucyA9IG9wdHM7XG4gIH0pO1xuXG4gIGxldCByZXQgPSBuZXcgQ29tcGlsZXJIb3N0KHJvb3RDYWNoZURpciwgY29tcGlsZXJzLCBmaWxlQ2hhbmdlQ2FjaGUsIGZhbHNlLCBjb21waWxlcnNbJ3RleHQvcGxhaW4nXSwgbnVsbCwganNvbi5taW1lVHlwZXNUb1JlZ2lzdGVyKTtcblxuICAvLyBOQjogSXQncyBzdXBlciBpbXBvcnRhbnQgdGhhdCB3ZSBndWFyYW50ZWUgdGhhdCB0aGUgY29uZmlndXJhdGlvbiBpcyBzYXZlZFxuICAvLyBvdXQsIGJlY2F1c2Ugd2UnbGwgbmVlZCB0byByZS1yZWFkIGl0IGluIHRoZSByZW5kZXJlciBwcm9jZXNzXG4gIGQoYENyZWF0ZWQgY29tcGlsZXIgaG9zdCB3aXRoIG9wdGlvbnM6ICR7SlNPTi5zdHJpbmdpZnkoaW5mbyl9YCk7XG4gIHJldC5zYXZlQ29uZmlndXJhdGlvblN5bmMoKTtcbiAgcmV0dXJuIHJldDtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgY29tcGlsZXIgaG9zdCBmcm9tIGEgLmJhYmVscmMgZmlsZS4gVGhpcyBtZXRob2QgaXMgdXN1YWxseSBjYWxsZWRcbiAqIGZyb20ge0BsaW5rIGNyZWF0ZUNvbXBpbGVySG9zdEZyb21Qcm9qZWN0Um9vdH0gaW5zdGVhZCBvZiB1c2VkIGRpcmVjdGx5LlxuICpcbiAqIEBwYXJhbSAge3N0cmluZ30gZmlsZSAgVGhlIHBhdGggdG8gYSAuYmFiZWxyYyBmaWxlXG4gKlxuICogQHBhcmFtICB7c3RyaW5nfSByb290Q2FjaGVEaXIgKG9wdGlvbmFsKSAgVGhlIGRpcmVjdG9yeSB0byB1c2UgYXMgYSBjYWNoZS5cbiAqXG4gKiBAcmV0dXJuIHtQcm9taXNlPENvbXBpbGVySG9zdD59ICBBIHNldC11cCBjb21waWxlciBob3N0XG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVDb21waWxlckhvc3RGcm9tQmFiZWxSYyhmaWxlLCByb290Q2FjaGVEaXI9bnVsbCwgc291cmNlTWFwUGF0aCA9IG51bGwpIHtcbiAgbGV0IGluZm8gPSBKU09OLnBhcnNlKGF3YWl0IHBmcy5yZWFkRmlsZShmaWxlLCAndXRmOCcpKTtcblxuICAvLyBwYWNrYWdlLmpzb25cbiAgaWYgKCdiYWJlbCcgaW4gaW5mbykge1xuICAgIGluZm8gPSBpbmZvLmJhYmVsO1xuICB9XG5cbiAgaWYgKCdlbnYnIGluIGluZm8pIHtcbiAgICBsZXQgb3VyRW52ID0gcHJvY2Vzcy5lbnYuQkFCRUxfRU5WIHx8IHByb2Nlc3MuZW52Lk5PREVfRU5WIHx8ICdkZXZlbG9wbWVudCc7XG4gICAgaW5mbyA9IGluZm8uZW52W291ckVudl07XG4gIH1cblxuICAvLyBBcmUgd2Ugc3RpbGwgcGFja2FnZS5qc29uIChpLmUuIGlzIHRoZXJlIG5vIGJhYmVsIGluZm8gd2hhdHNvZXZlcj8pXG4gIGlmICgnbmFtZScgaW4gaW5mbyAmJiAndmVyc2lvbicgaW4gaW5mbykge1xuICAgIGxldCBhcHBSb290ID0gcGF0aC5kaXJuYW1lKGZpbGUpO1xuICAgIHJldHVybiBjcmVhdGVDb21waWxlckhvc3RGcm9tQ29uZmlndXJhdGlvbih7XG4gICAgICBhcHBSb290OiBhcHBSb290LFxuICAgICAgb3B0aW9uczogZ2V0RGVmYXVsdENvbmZpZ3VyYXRpb24oYXBwUm9vdCksXG4gICAgICByb290Q2FjaGVEaXIsXG4gICAgICBzb3VyY2VNYXBQYXRoXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gY3JlYXRlQ29tcGlsZXJIb3N0RnJvbUNvbmZpZ3VyYXRpb24oe1xuICAgIGFwcFJvb3Q6IHBhdGguZGlybmFtZShmaWxlKSxcbiAgICBvcHRpb25zOiB7XG4gICAgICAnYXBwbGljYXRpb24vamF2YXNjcmlwdCc6IGluZm9cbiAgICB9LFxuICAgIHJvb3RDYWNoZURpcixcbiAgICBzb3VyY2VNYXBQYXRoXG4gIH0pO1xufVxuXG5cbi8qKlxuICogQ3JlYXRlcyBhIGNvbXBpbGVyIGhvc3QgZnJvbSBhIC5jb21waWxlcmMgZmlsZS4gVGhpcyBtZXRob2QgaXMgdXN1YWxseSBjYWxsZWRcbiAqIGZyb20ge0BsaW5rIGNyZWF0ZUNvbXBpbGVySG9zdEZyb21Qcm9qZWN0Um9vdH0gaW5zdGVhZCBvZiB1c2VkIGRpcmVjdGx5LlxuICpcbiAqIEBwYXJhbSAge3N0cmluZ30gZmlsZSAgVGhlIHBhdGggdG8gYSAuY29tcGlsZXJjIGZpbGVcbiAqXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHJvb3RDYWNoZURpciAob3B0aW9uYWwpICBUaGUgZGlyZWN0b3J5IHRvIHVzZSBhcyBhIGNhY2hlLlxuICpcbiAqIEByZXR1cm4ge1Byb21pc2U8Q29tcGlsZXJIb3N0Pn0gIEEgc2V0LXVwIGNvbXBpbGVyIGhvc3RcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZUNvbXBpbGVySG9zdEZyb21Db25maWdGaWxlKGZpbGUsIHJvb3RDYWNoZURpcj1udWxsLCBzb3VyY2VNYXBQYXRoID0gbnVsbCkge1xuICBsZXQgaW5mbyA9IEpTT04ucGFyc2UoYXdhaXQgcGZzLnJlYWRGaWxlKGZpbGUsICd1dGY4JykpO1xuXG4gIGlmICgnZW52JyBpbiBpbmZvKSB7XG4gICAgbGV0IG91ckVudiA9IHByb2Nlc3MuZW52LkVMRUNUUk9OX0NPTVBJTEVfRU5WIHx8IHByb2Nlc3MuZW52Lk5PREVfRU5WIHx8ICdkZXZlbG9wbWVudCc7XG4gICAgaW5mbyA9IGluZm8uZW52W291ckVudl07XG4gIH1cblxuICByZXR1cm4gY3JlYXRlQ29tcGlsZXJIb3N0RnJvbUNvbmZpZ3VyYXRpb24oe1xuICAgIGFwcFJvb3Q6IHBhdGguZGlybmFtZShmaWxlKSxcbiAgICBvcHRpb25zOiBpbmZvLFxuICAgIHJvb3RDYWNoZURpcixcbiAgICBzb3VyY2VNYXBQYXRoXG4gIH0pO1xufVxuXG5cbi8qKlxuICogQ3JlYXRlcyBhIGNvbmZpZ3VyZWQge0BsaW5rIENvbXBpbGVySG9zdH0gaW5zdGFuY2UgZnJvbSB0aGUgcHJvamVjdCByb290XG4gKiBkaXJlY3RvcnkuIFRoaXMgbWV0aG9kIGZpcnN0IHNlYXJjaGVzIGZvciBhIC5jb21waWxlcmMgKG9yIC5jb21waWxlcmMuanNvbiksIHRoZW4gZmFsbHMgYmFjayB0byB0aGVcbiAqIGRlZmF1bHQgbG9jYXRpb25zIGZvciBCYWJlbCBjb25maWd1cmF0aW9uIGluZm8uIElmIG5laXRoZXIgYXJlIGZvdW5kLCBkZWZhdWx0c1xuICogdG8gc3RhbmRhcmQgc2V0dGluZ3NcbiAqXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHJvb3REaXIgIFRoZSByb290IGFwcGxpY2F0aW9uIGRpcmVjdG9yeSAoaS5lLiB0aGUgZGlyZWN0b3J5XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQgaGFzIHRoZSBhcHAncyBwYWNrYWdlLmpzb24pXG4gKlxuICogQHBhcmFtICB7c3RyaW5nfSByb290Q2FjaGVEaXIgKG9wdGlvbmFsKSAgVGhlIGRpcmVjdG9yeSB0byB1c2UgYXMgYSBjYWNoZS5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gc291cmNlTWFwUGF0aCAob3B0aW9uYWwpIFRoZSBkaXJlY3RvcnkgdG8gc3RvcmUgc291cmNlbWFwIHNlcGFyYXRlbHlcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIGNvbXBpbGVyIG9wdGlvbiBlbmFibGVkIHRvIGVtaXQuXG4gKlxuICogQHJldHVybiB7UHJvbWlzZTxDb21waWxlckhvc3Q+fSAgQSBzZXQtdXAgY29tcGlsZXIgaG9zdFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlQ29tcGlsZXJIb3N0RnJvbVByb2plY3RSb290KHJvb3REaXIsIHJvb3RDYWNoZURpciA9IG51bGwsIHNvdXJjZU1hcFBhdGggPSBudWxsKSB7XG4gIGxldCBjb21waWxlcmMgPSBwYXRoLmpvaW4ocm9vdERpciwgJy5jb21waWxlcmMnKTtcbiAgaWYgKHN0YXRTeW5jTm9FeGNlcHRpb24oY29tcGlsZXJjKSkge1xuICAgIGQoYEZvdW5kIGEgLmNvbXBpbGVyYyBhdCAke2NvbXBpbGVyY30sIHVzaW5nIGl0YCk7XG4gICAgcmV0dXJuIGF3YWl0IGNyZWF0ZUNvbXBpbGVySG9zdEZyb21Db25maWdGaWxlKGNvbXBpbGVyYywgcm9vdENhY2hlRGlyLCBzb3VyY2VNYXBQYXRoKTtcbiAgfVxuICBjb21waWxlcmMgKz0gJy5qc29uJztcbiAgaWYgKHN0YXRTeW5jTm9FeGNlcHRpb24oY29tcGlsZXJjKSkge1xuICAgIGQoYEZvdW5kIGEgLmNvbXBpbGVyYyBhdCAke2NvbXBpbGVyY30sIHVzaW5nIGl0YCk7XG4gICAgcmV0dXJuIGF3YWl0IGNyZWF0ZUNvbXBpbGVySG9zdEZyb21Db25maWdGaWxlKGNvbXBpbGVyYywgcm9vdENhY2hlRGlyLCBzb3VyY2VNYXBQYXRoKTtcbiAgfVxuXG4gIGxldCBiYWJlbHJjID0gcGF0aC5qb2luKHJvb3REaXIsICcuYmFiZWxyYycpO1xuICBpZiAoc3RhdFN5bmNOb0V4Y2VwdGlvbihiYWJlbHJjKSkge1xuICAgIGQoYEZvdW5kIGEgLmJhYmVscmMgYXQgJHtiYWJlbHJjfSwgdXNpbmcgaXRgKTtcbiAgICByZXR1cm4gYXdhaXQgY3JlYXRlQ29tcGlsZXJIb3N0RnJvbUJhYmVsUmMoYmFiZWxyYywgcm9vdENhY2hlRGlyLCBzb3VyY2VNYXBQYXRoKTtcbiAgfVxuXG4gIGQoYFVzaW5nIHBhY2thZ2UuanNvbiBvciBkZWZhdWx0IHBhcmFtZXRlcnMgYXQgJHtyb290RGlyfWApO1xuICByZXR1cm4gYXdhaXQgY3JlYXRlQ29tcGlsZXJIb3N0RnJvbUJhYmVsUmMocGF0aC5qb2luKHJvb3REaXIsICdwYWNrYWdlLmpzb24nKSwgcm9vdENhY2hlRGlyLCBzb3VyY2VNYXBQYXRoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNvbXBpbGVySG9zdEZyb21CYWJlbFJjU3luYyhmaWxlLCByb290Q2FjaGVEaXI9bnVsbCwgc291cmNlTWFwUGF0aCA9IG51bGwpIHtcbiAgbGV0IGluZm8gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpKTtcblxuICAvLyBwYWNrYWdlLmpzb25cbiAgaWYgKCdiYWJlbCcgaW4gaW5mbykge1xuICAgIGluZm8gPSBpbmZvLmJhYmVsO1xuICB9XG5cbiAgaWYgKCdlbnYnIGluIGluZm8pIHtcbiAgICBsZXQgb3VyRW52ID0gcHJvY2Vzcy5lbnYuQkFCRUxfRU5WIHx8IHByb2Nlc3MuZW52Lk5PREVfRU5WIHx8ICdkZXZlbG9wbWVudCc7XG4gICAgaW5mbyA9IGluZm8uZW52W291ckVudl07XG4gIH1cblxuICAvLyBBcmUgd2Ugc3RpbGwgcGFja2FnZS5qc29uIChpLmUuIGlzIHRoZXJlIG5vIGJhYmVsIGluZm8gd2hhdHNvZXZlcj8pXG4gIGlmICgnbmFtZScgaW4gaW5mbyAmJiAndmVyc2lvbicgaW4gaW5mbykge1xuICAgIGxldCBhcHBSb290ID0gcGF0aC5kaXJuYW1lKGZpbGUpXG4gICAgcmV0dXJuIGNyZWF0ZUNvbXBpbGVySG9zdEZyb21Db25maWd1cmF0aW9uKHtcbiAgICAgIGFwcFJvb3Q6IGFwcFJvb3QsXG4gICAgICBvcHRpb25zOiBnZXREZWZhdWx0Q29uZmlndXJhdGlvbihhcHBSb290KSxcbiAgICAgIHJvb3RDYWNoZURpcixcbiAgICAgIHNvdXJjZU1hcFBhdGhcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBjcmVhdGVDb21waWxlckhvc3RGcm9tQ29uZmlndXJhdGlvbih7XG4gICAgYXBwUm9vdDogcGF0aC5kaXJuYW1lKGZpbGUpLFxuICAgIG9wdGlvbnM6IHtcbiAgICAgICdhcHBsaWNhdGlvbi9qYXZhc2NyaXB0JzogaW5mb1xuICAgIH0sXG4gICAgcm9vdENhY2hlRGlyLFxuICAgIHNvdXJjZU1hcFBhdGhcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVDb21waWxlckhvc3RGcm9tQ29uZmlnRmlsZVN5bmMoZmlsZSwgcm9vdENhY2hlRGlyPW51bGwsIHNvdXJjZU1hcFBhdGggPSBudWxsKSB7XG4gIGxldCBpbmZvID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKSk7XG5cbiAgaWYgKCdlbnYnIGluIGluZm8pIHtcbiAgICBsZXQgb3VyRW52ID0gcHJvY2Vzcy5lbnYuRUxFQ1RST05fQ09NUElMRV9FTlYgfHwgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgfHwgJ2RldmVsb3BtZW50JztcbiAgICBpbmZvID0gaW5mby5lbnZbb3VyRW52XTtcbiAgfVxuXG4gIHJldHVybiBjcmVhdGVDb21waWxlckhvc3RGcm9tQ29uZmlndXJhdGlvbih7XG4gICAgYXBwUm9vdDogcGF0aC5kaXJuYW1lKGZpbGUpLFxuICAgIG9wdGlvbnM6IGluZm8sXG4gICAgcm9vdENhY2hlRGlyLFxuICAgIHNvdXJjZU1hcFBhdGhcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVDb21waWxlckhvc3RGcm9tUHJvamVjdFJvb3RTeW5jKHJvb3REaXIsIHJvb3RDYWNoZURpciA9IG51bGwsIHNvdXJjZU1hcFBhdGggPSBudWxsKSB7XG4gIGxldCBjb21waWxlcmMgPSBwYXRoLmpvaW4ocm9vdERpciwgJy5jb21waWxlcmMnKTtcbiAgaWYgKHN0YXRTeW5jTm9FeGNlcHRpb24oY29tcGlsZXJjKSkge1xuICAgIGQoYEZvdW5kIGEgLmNvbXBpbGVyYyBhdCAke2NvbXBpbGVyY30sIHVzaW5nIGl0YCk7XG4gICAgcmV0dXJuIGNyZWF0ZUNvbXBpbGVySG9zdEZyb21Db25maWdGaWxlU3luYyhjb21waWxlcmMsIHJvb3RDYWNoZURpciwgc291cmNlTWFwUGF0aCk7XG4gIH1cblxuICBsZXQgYmFiZWxyYyA9IHBhdGguam9pbihyb290RGlyLCAnLmJhYmVscmMnKTtcbiAgaWYgKHN0YXRTeW5jTm9FeGNlcHRpb24oYmFiZWxyYykpIHtcbiAgICBkKGBGb3VuZCBhIC5iYWJlbHJjIGF0ICR7YmFiZWxyY30sIHVzaW5nIGl0YCk7XG4gICAgcmV0dXJuIGNyZWF0ZUNvbXBpbGVySG9zdEZyb21CYWJlbFJjU3luYyhiYWJlbHJjLCByb290Q2FjaGVEaXIsIHNvdXJjZU1hcFBhdGgpO1xuICB9XG5cbiAgZChgVXNpbmcgcGFja2FnZS5qc29uIG9yIGRlZmF1bHQgcGFyYW1ldGVycyBhdCAke3Jvb3REaXJ9YCk7XG4gIHJldHVybiBjcmVhdGVDb21waWxlckhvc3RGcm9tQmFiZWxSY1N5bmMocGF0aC5qb2luKHJvb3REaXIsICdwYWNrYWdlLmpzb24nKSwgcm9vdENhY2hlRGlyLCBzb3VyY2VNYXBQYXRoKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHdoYXQgZWxlY3Ryb24tY29tcGlsZSB3b3VsZCB1c2UgYXMgYSBkZWZhdWx0IHJvb3RDYWNoZURpci4gVXN1YWxseSBvbmx5XG4gKiB1c2VkIGZvciBkZWJ1Z2dpbmcgcHVycG9zZXNcbiAqXG4gKiBAcmV0dXJuIHtzdHJpbmd9ICBBIHBhdGggdGhhdCBtYXkgb3IgbWF5IG5vdCBleGlzdCB3aGVyZSBlbGVjdHJvbi1jb21waWxlIHdvdWxkXG4gKiAgICAgICAgICAgICAgICAgICBzZXQgdXAgYSBkZXZlbG9wbWVudCBtb2RlIGNhY2hlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY2FsY3VsYXRlRGVmYXVsdENvbXBpbGVDYWNoZURpcmVjdG9yeSgpIHtcbiAgbGV0IHRtcERpciA9IHByb2Nlc3MuZW52LlRFTVAgfHwgcHJvY2Vzcy5lbnYuVE1QRElSIHx8ICcvdG1wJztcbiAgbGV0IGhhc2ggPSByZXF1aXJlKCdjcnlwdG8nKS5jcmVhdGVIYXNoKCdtZDUnKS51cGRhdGUocHJvY2Vzcy5leGVjUGF0aCkuZGlnZXN0KCdoZXgnKTtcblxuICBsZXQgY2FjaGVEaXIgPSBwYXRoLmpvaW4odG1wRGlyLCBgY29tcGlsZUNhY2hlXyR7aGFzaH1gKTtcbiAgbWtkaXJwLnN5bmMoY2FjaGVEaXIpO1xuXG4gIGQoYFVzaW5nIGRlZmF1bHQgY2FjaGUgZGlyZWN0b3J5OiAke2NhY2hlRGlyfWApO1xuICByZXR1cm4gY2FjaGVEaXI7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVNvdXJjZU1hcERpcmVjdG9yeShzb3VyY2VNYXBQYXRoKSB7XG4gIG1rZGlycC5zeW5jKHNvdXJjZU1hcFBhdGgpO1xuICBkKGBVc2luZyBzZXBhcmF0ZSBzb3VyY2VtYXAgcGF0aCBhdCAke3NvdXJjZU1hcFBhdGh9YCk7XG59XG5cbmZ1bmN0aW9uIGdldEVsZWN0cm9uVmVyc2lvbihyb290RGlyKSB7XG4gIGlmIChwcm9jZXNzLnZlcnNpb25zLmVsZWN0cm9uKSB7XG4gICAgcmV0dXJuIHByb2Nlc3MudmVyc2lvbnMuZWxlY3Ryb247XG4gIH1cblxuICBsZXQgb3VyUGtnSnNvbiA9IHJlcXVpcmUocGF0aC5qb2luKHJvb3REaXIsICdwYWNrYWdlLmpzb24nKSk7XG5cbiAgbGV0IHZlcnNpb24gPSBbJ2VsZWN0cm9uLXByZWJ1aWx0LWNvbXBpbGUnLCAnZWxlY3Ryb24nXS5tYXAobW9kID0+IHtcbiAgICBpZiAob3VyUGtnSnNvbi5kZXZEZXBlbmRlbmNpZXMgJiYgb3VyUGtnSnNvbi5kZXZEZXBlbmRlbmNpZXNbbW9kXSkge1xuICAgICAgLy8gTkI6IGxvbCB0aGlzIGNvZGVcbiAgICAgIGxldCB2ZXJSYW5nZSA9IG91clBrZ0pzb24uZGV2RGVwZW5kZW5jaWVzW21vZF07XG4gICAgICBsZXQgbSA9IHZlclJhbmdlLm1hdGNoKC8oXFxkK1xcLlxcZCtcXC5cXGQrKS8pO1xuICAgICAgaWYgKG0gJiYgbVsxXSkgcmV0dXJuIG1bMV07XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBwcm9jZXNzLm1haW5Nb2R1bGUucmVxdWlyZShgJHttb2R9L3BhY2thZ2UuanNvbmApLnZlcnNpb247XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gTkI6IFRoaXMgdXN1YWxseSBkb2Vzbid0IHdvcmssIGJ1dCBzb21ldGltZXMgbWF5YmU/XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGxldCBwID0gcGF0aC5qb2luKHJvb3REaXIsIG1vZCwgJ3BhY2thZ2UuanNvbicpO1xuICAgICAgcmV0dXJuIHJlcXVpcmUocCkudmVyc2lvbjtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH0pLmZpbmQoeCA9PiAhIXgpO1xuXG4gIGlmICghdmVyc2lvbikge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGF1dG9tYXRpY2FsbHkgZGlzY292ZXIgdGhlIHZlcnNpb24gb2YgRWxlY3Ryb24sIHlvdSBwcm9iYWJseSBuZWVkIGEgLmNvbXBpbGVyYyBmaWxlXCIpO1xuICB9XG5cbiAgcmV0dXJuIHZlcnNpb247XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgZGVmYXVsdCAuY29uZmlncmMgaWYgbm8gY29uZmlndXJhdGlvbiBpbmZvcm1hdGlvbiBjYW4gYmUgZm91bmQuXG4gKlxuICogQHJldHVybiB7T2JqZWN0fSAgQSBsaXN0IG9mIGRlZmF1bHQgY29uZmlnIHNldHRpbmdzIGZvciBlbGVjdHJvbi1jb21waWxlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldERlZmF1bHRDb25maWd1cmF0aW9uKHJvb3REaXIpIHtcbiAgcmV0dXJuIHtcbiAgICAnYXBwbGljYXRpb24vamF2YXNjcmlwdCc6IHtcbiAgICAgIFwicHJlc2V0c1wiOiBbXG4gICAgICAgIFtcImVudlwiLCB7XG4gICAgICAgICAgXCJ0YXJnZXRzXCI6IHtcbiAgICAgICAgICAgIFwiZWxlY3Ryb25cIjogZ2V0RWxlY3Ryb25WZXJzaW9uKHJvb3REaXIpXG4gICAgICAgICAgfVxuICAgICAgICB9XSxcbiAgICAgICAgXCJyZWFjdFwiXG4gICAgICBdLFxuICAgICAgXCJzb3VyY2VNYXBzXCI6IFwiaW5saW5lXCJcbiAgICB9XG4gIH07XG59XG5cbi8qKlxuICogQWxsb3dzIHlvdSB0byBjcmVhdGUgbmV3IGluc3RhbmNlcyBvZiBhbGwgY29tcGlsZXJzIHRoYXQgYXJlIHN1cHBvcnRlZCBieVxuICogZWxlY3Ryb24tY29tcGlsZSBhbmQgdXNlIHRoZW0gZGlyZWN0bHkuIEN1cnJlbnRseSBzdXBwb3J0cyBCYWJlbCwgQ29mZmVlU2NyaXB0LFxuICogVHlwZVNjcmlwdCwgTGVzcywgYW5kIEphZGUuXG4gKlxuICogQHJldHVybiB7T2JqZWN0fSAgQW4gT2JqZWN0IHdob3NlIEtleXMgYXJlIE1JTUUgdHlwZXMsIGFuZCB3aG9zZSB2YWx1ZXNcbiAqIGFyZSBpbnN0YW5jZXMgb2YgQHtsaW5rIENvbXBpbGVyQmFzZX0uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVDb21waWxlcnMoKSB7XG4gIGlmICghYWxsQ29tcGlsZXJDbGFzc2VzKSB7XG4gICAgLy8gRmlyc3Qgd2Ugd2FudCB0byBzZWUgaWYgZWxlY3Ryb24tY29tcGlsZXJzIGl0c2VsZiBoYXMgYmVlbiBpbnN0YWxsZWQgd2l0aFxuICAgIC8vIGRldkRlcGVuZGVuY2llcy4gSWYgdGhhdCdzIG5vdCB0aGUgY2FzZSwgY2hlY2sgdG8gc2VlIGlmXG4gICAgLy8gZWxlY3Ryb24tY29tcGlsZXJzIGlzIGluc3RhbGxlZCBhcyBhIHBlZXIgZGVwZW5kZW5jeSAocHJvYmFibHkgYXMgYVxuICAgIC8vIGRldkRlcGVuZGVuY3kgb2YgdGhlIHJvb3QgcHJvamVjdCkuXG4gICAgY29uc3QgbG9jYXRpb25zID0gWydlbGVjdHJvbi1jb21waWxlcnMnLCAnLi4vLi4vZWxlY3Ryb24tY29tcGlsZXJzJ107XG5cbiAgICBmb3IgKGxldCBsb2NhdGlvbiBvZiBsb2NhdGlvbnMpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGFsbENvbXBpbGVyQ2xhc3NlcyA9IHJlcXVpcmUobG9jYXRpb24pO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBZb2xvXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFhbGxDb21waWxlckNsYXNzZXMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkVsZWN0cm9uIGNvbXBpbGVycyBub3QgZm91bmQgYnV0IHdlcmUgcmVxdWVzdGVkIHRvIGJlIGxvYWRlZFwiKTtcbiAgICB9XG4gIH1cblxuICAvLyBOQjogTm90ZSB0aGF0IHRoaXMgY29kZSBpcyBjYXJlZnVsbHkgc2V0IHVwIHNvIHRoYXQgSW5saW5lSHRtbENvbXBpbGVyXG4gIC8vIChpLmUuIGNsYXNzZXMgd2l0aCBgY3JlYXRlRnJvbUNvbXBpbGVyc2ApIGluaXRpYWxseSBnZXQgYW4gZW1wdHkgb2JqZWN0LFxuICAvLyBidXQgd2lsbCBoYXZlIGEgcmVmZXJlbmNlIHRvIHRoZSBmaW5hbCByZXN1bHQgb2Ygd2hhdCB3ZSByZXR1cm4sIHdoaWNoXG4gIC8vIHJlc29sdmVzIHRoZSBjaXJjdWxhciBkZXBlbmRlbmN5IHdlJ2Qgb3RoZXJ3aXNlIGhhdmUgaGVyZS5cbiAgbGV0IHJldCA9IHt9O1xuICBsZXQgaW5zdGFudGlhdGVkQ2xhc3NlcyA9IGFsbENvbXBpbGVyQ2xhc3Nlcy5tYXAoKEtsYXNzKSA9PiB7XG4gICAgaWYgKCdjcmVhdGVGcm9tQ29tcGlsZXJzJyBpbiBLbGFzcykge1xuICAgICAgcmV0dXJuIEtsYXNzLmNyZWF0ZUZyb21Db21waWxlcnMocmV0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG5ldyBLbGFzcygpO1xuICAgIH1cbiAgfSk7XG5cbiAgaW5zdGFudGlhdGVkQ2xhc3Nlcy5yZWR1Y2UoKGFjYyx4KSA9PiB7XG4gICAgbGV0IEtsYXNzID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHgpLmNvbnN0cnVjdG9yO1xuXG4gICAgZm9yIChsZXQgdHlwZSBvZiBLbGFzcy5nZXRJbnB1dE1pbWVUeXBlcygpKSB7IGFjY1t0eXBlXSA9IHg7IH1cbiAgICByZXR1cm4gYWNjO1xuICB9LCByZXQpO1xuXG4gIHJldHVybiByZXQ7XG59XG4iXX0=