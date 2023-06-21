'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _mimeTypes = require('@paulcbetts/mime-types');

var _mimeTypes2 = _interopRequireDefault(_mimeTypes);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _zlib = require('zlib');

var _zlib2 = _interopRequireDefault(_zlib);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _promise = require('./promise');

var _forAllFiles = require('./for-all-files');

var _compileCache = require('./compile-cache');

var _compileCache2 = _interopRequireDefault(_compileCache);

var _fileChangeCache = require('./file-change-cache');

var _fileChangeCache2 = _interopRequireDefault(_fileChangeCache);

var _readOnlyCompiler = require('./read-only-compiler');

var _readOnlyCompiler2 = _interopRequireDefault(_readOnlyCompiler);

var _browserSignal = require('./browser-signal');

require('rxjs/add/operator/map');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const d = require('debug')('electron-compile:compiler-host');

require('./rig-mime-types').init();

// This isn't even my
const finalForms = {
  'text/javascript': true,
  'application/javascript': true,
  'text/html': true,
  'text/css': true,
  'image/svg+xml': true,
  'application/json': true
};

/**
 * This class is the top-level class that encapsulates all of the logic of
 * compiling and caching application code. If you're looking for a "Main class",
 * this is it.
 *
 * This class can be created directly but it is usually created via the methods
 * in config-parser, which will among other things, set up the compiler options
 * given a project root.
 *
 * CompilerHost is also the top-level class that knows how to serialize all of the
 * information necessary to recreate itself, either as a development host (i.e.
 * will allow cache misses and actual compilation), or as a read-only version of
 * itself for production.
 */
class CompilerHost {
  /**
   * Creates an instance of CompilerHost. You probably want to use the methods
   * in config-parser for development, or {@link createReadonlyFromConfiguration}
   * for production instead.
   *
   * @param  {string} rootCacheDir  The root directory to use for the cache
   *
   * @param  {Object} compilers  an Object whose keys are input MIME types and
   *                             whose values are instances of CompilerBase. Create
   *                             this via the {@link createCompilers} method in
   *                             config-parser.
   *
   * @param  {FileChangedCache} fileChangeCache  A file-change cache that is
   *                                             optionally pre-loaded.
   *
   * @param  {boolean} readOnlyMode  If True, cache misses will fail and
   *                                 compilation will not be attempted.
   *
   * @param  {CompilerBase} fallbackCompiler (optional)  When a file is compiled
   *                                         which doesn't have a matching compiler,
   *                                         this compiler will be used instead. If
   *                                         null, will fail compilation. A good
   *                                         alternate fallback is the compiler for
   *                                         'text/plain', which is guaranteed to be
   *                                         present.
   *
   * @param {string} sourceMapPath (optional) The directory to store sourcemap separately
   *                               if compiler option enabled to emit.
   *                               Default to cachePath if not specified.
   */
  constructor(rootCacheDir, compilers, fileChangeCache, readOnlyMode) {
    let fallbackCompiler = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;
    let sourceMapPath = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : null;
    let mimeTypesToRegister = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : null;

    let compilersByMimeType = Object.assign({}, compilers);
    Object.assign(this, { rootCacheDir, compilersByMimeType, fileChangeCache, readOnlyMode, fallbackCompiler });
    this.appRoot = this.fileChangeCache.appRoot;

    this.cachesForCompilers = Object.keys(compilersByMimeType).reduce((acc, x) => {
      let compiler = compilersByMimeType[x];
      if (acc.has(compiler)) return acc;

      acc.set(compiler, _compileCache2.default.createFromCompiler(rootCacheDir, compiler, fileChangeCache, readOnlyMode, sourceMapPath));
      return acc;
    }, new Map());

    this.mimeTypesToRegister = mimeTypesToRegister || {};
  }

  /**
   * Creates a production-mode CompilerHost from the previously saved
   * configuration
   *
   * @param  {string} rootCacheDir  The root directory to use for the cache. This
   *                                cache must have cache information saved via
   *                                {@link saveConfiguration}
   *
   * @param  {string} appRoot  The top-level directory for your application (i.e.
   *                           the one which has your package.json).
   *
   * @param  {CompilerBase} fallbackCompiler (optional)  When a file is compiled
   *                                         which doesn't have a matching compiler,
   *                                         this compiler will be used instead. If
   *                                         null, will fail compilation. A good
   *                                         alternate fallback is the compiler for
   *                                         'text/plain', which is guaranteed to be
   *                                         present.
   *
   * @return {Promise<CompilerHost>}  A read-only CompilerHost
   */
  static createReadonlyFromConfiguration(rootCacheDir, appRoot) {
    let fallbackCompiler = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    return _asyncToGenerator(function* () {
      let target = _path2.default.join(rootCacheDir, 'compiler-info.json.gz');
      let buf = yield _promise.pfs.readFile(target);
      let info = JSON.parse((yield _promise.pzlib.gunzip(buf)));

      let fileChangeCache = _fileChangeCache2.default.loadFromData(info.fileChangeCache, appRoot, true);

      let compilers = Object.keys(info.compilers).reduce(function (acc, x) {
        let cur = info.compilers[x];
        acc[x] = new _readOnlyCompiler2.default(cur.name, cur.compilerVersion, cur.compilerOptions, cur.inputMimeTypes);

        return acc;
      }, {});

      return new CompilerHost(rootCacheDir, compilers, fileChangeCache, true, fallbackCompiler, null, info.mimeTypesToRegister);
    })();
  }

  /**
   * Creates a development-mode CompilerHost from the previously saved
   * configuration.
   *
   * @param  {string} rootCacheDir  The root directory to use for the cache. This
   *                                cache must have cache information saved via
   *                                {@link saveConfiguration}
   *
   * @param  {string} appRoot  The top-level directory for your application (i.e.
   *                           the one which has your package.json).
   *
   * @param  {Object} compilersByMimeType  an Object whose keys are input MIME
   *                                       types and whose values are instances
   *                                       of CompilerBase. Create this via the
   *                                       {@link createCompilers} method in
   *                                       config-parser.
   *
   * @param  {CompilerBase} fallbackCompiler (optional)  When a file is compiled
   *                                         which doesn't have a matching compiler,
   *                                         this compiler will be used instead. If
   *                                         null, will fail compilation. A good
   *                                         alternate fallback is the compiler for
   *                                         'text/plain', which is guaranteed to be
   *                                         present.
   *
   * @return {Promise<CompilerHost>}  A read-only CompilerHost
   */
  static createFromConfiguration(rootCacheDir, appRoot, compilersByMimeType) {
    let fallbackCompiler = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
    return _asyncToGenerator(function* () {
      let target = _path2.default.join(rootCacheDir, 'compiler-info.json.gz');
      let buf = yield _promise.pfs.readFile(target);
      let info = JSON.parse((yield _promise.pzlib.gunzip(buf)));

      let fileChangeCache = _fileChangeCache2.default.loadFromData(info.fileChangeCache, appRoot, false);

      Object.keys(info.compilers).forEach(function (x) {
        let cur = info.compilers[x];
        compilersByMimeType[x].compilerOptions = cur.compilerOptions;
      });

      return new CompilerHost(rootCacheDir, compilersByMimeType, fileChangeCache, false, fallbackCompiler, null, info.mimeTypesToRegister);
    })();
  }

  /**
   * Saves the current compiler configuration to a file that
   * {@link createReadonlyFromConfiguration} can use to recreate the current
   * compiler environment
   *
   * @return {Promise}  Completion
   */
  saveConfiguration() {
    var _this = this;

    return _asyncToGenerator(function* () {
      let serializedCompilerOpts = Object.keys(_this.compilersByMimeType).reduce(function (acc, x) {
        let compiler = _this.compilersByMimeType[x];
        let Klass = Object.getPrototypeOf(compiler).constructor;

        let val = {
          name: Klass.name,
          inputMimeTypes: Klass.getInputMimeTypes(),
          compilerOptions: compiler.compilerOptions,
          compilerVersion: compiler.getCompilerVersion()
        };

        acc[x] = val;
        return acc;
      }, {});

      let info = {
        fileChangeCache: _this.fileChangeCache.getSavedData(),
        compilers: serializedCompilerOpts,
        mimeTypesToRegister: _this.mimeTypesToRegister
      };

      let target = _path2.default.join(_this.rootCacheDir, 'compiler-info.json.gz');
      let buf = yield _promise.pzlib.gzip(new Buffer(JSON.stringify(info)));
      yield _promise.pfs.writeFile(target, buf);
    })();
  }

  /**
   * Compiles a file and returns the compiled result.
   *
   * @param  {string} filePath  The path to the file to compile
   *
   * @return {Promise<object>}  An Object with the compiled result
   *
   * @property {Object} hashInfo  The hash information returned from getHashForPath
   * @property {string} code  The source code if the file was a text file
   * @property {Buffer} binaryData  The file if it was a binary file
   * @property {string} mimeType  The MIME type saved in the cache.
   * @property {string[]} dependentFiles  The dependent files returned from
   *                                      compiling the file, if any.
   */
  compile(filePath) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      let ret = yield _this2.readOnlyMode ? _this2.compileReadOnly(filePath) : _this2.fullCompile(filePath);

      if (ret.mimeType === 'application/javascript') {
        _this2.mimeTypesToRegister[_mimeTypes2.default.lookup(filePath)] = true;
      }

      return ret;
    })();
  }

  /**
   * Handles compilation in read-only mode
   *
   * @private
   */
  compileReadOnly(filePath) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      // We guarantee that node_modules are always shipped directly
      let type = _mimeTypes2.default.lookup(filePath);
      if (_fileChangeCache2.default.isInNodeModules(filePath)) {
        return {
          mimeType: type || 'application/javascript',
          code: yield _promise.pfs.readFile(filePath, 'utf8')
        };
      }

      let hashInfo = yield _this3.fileChangeCache.getHashForPath(filePath);

      // NB: Here, we're basically only using the compiler here to find
      // the appropriate CompileCache
      let compiler = CompilerHost.shouldPassthrough(hashInfo) ? _this3.getPassthroughCompiler() : _this3.compilersByMimeType[type || '__lolnothere'];

      // NB: We don't put this into shouldPassthrough because Inline HTML
      // compiler is technically of type finalForms (i.e. a browser can
      // natively handle this content), yet its compiler is
      // InlineHtmlCompiler. However, we still want to catch standard CSS files
      // which will be processed by PassthroughCompiler.
      if (finalForms[type] && !compiler) {
        compiler = _this3.getPassthroughCompiler();
      }

      if (!compiler) {
        compiler = _this3.fallbackCompiler;

        var _ref = yield compiler.get(filePath);

        let code = _ref.code,
            binaryData = _ref.binaryData,
            mimeType = _ref.mimeType;

        return { code: code || binaryData, mimeType };
      }

      let cache = _this3.cachesForCompilers.get(compiler);

      var _ref2 = yield cache.get(filePath);

      let code = _ref2.code,
          binaryData = _ref2.binaryData,
          mimeType = _ref2.mimeType;


      code = code || binaryData;
      if (!code || !mimeType) {
        throw new Error(`Asked to compile ${filePath} in production, is this file not precompiled?`);
      }

      return { code, mimeType };
    })();
  }

  /**
   * Handles compilation in read-write mode
   *
   * @private
   */
  fullCompile(filePath) {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      d(`Compiling ${filePath}`);
      let type = _mimeTypes2.default.lookup(filePath);

      (0, _browserSignal.send)('electron-compile-compiled-file', { filePath, mimeType: type });

      let hashInfo = yield _this4.fileChangeCache.getHashForPath(filePath);

      if (hashInfo.isInNodeModules) {
        let code = hashInfo.sourceCode || (yield _promise.pfs.readFile(filePath, 'utf8'));
        code = yield CompilerHost.fixNodeModulesSourceMapping(code, filePath, _this4.fileChangeCache.appRoot);
        return { code, mimeType: type };
      }

      let compiler = CompilerHost.shouldPassthrough(hashInfo) ? _this4.getPassthroughCompiler() : _this4.compilersByMimeType[type || '__lolnothere'];

      if (!compiler) {
        d(`Falling back to passthrough compiler for ${filePath}`);
        compiler = _this4.fallbackCompiler;
      }

      if (!compiler) {
        throw new Error(`Couldn't find a compiler for ${filePath}`);
      }

      let cache = _this4.cachesForCompilers.get(compiler);
      return yield cache.getOrFetch(filePath, function (filePath, hashInfo) {
        return _this4.compileUncached(filePath, hashInfo, compiler);
      });
    })();
  }

  /**
   * Handles invoking compilers independent of caching
   *
   * @private
   */
  compileUncached(filePath, hashInfo, compiler) {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      let inputMimeType = _mimeTypes2.default.lookup(filePath);

      if (hashInfo.isFileBinary) {
        return {
          binaryData: hashInfo.binaryData || (yield _promise.pfs.readFile(filePath)),
          mimeType: inputMimeType,
          dependentFiles: []
        };
      }

      let ctx = {};
      let code = hashInfo.sourceCode || (yield _promise.pfs.readFile(filePath, 'utf8'));

      if (!(yield compiler.shouldCompileFile(code, ctx))) {
        d(`Compiler returned false for shouldCompileFile: ${filePath}`);
        return { code, mimeType: _mimeTypes2.default.lookup(filePath), dependentFiles: [] };
      }

      let dependentFiles = yield compiler.determineDependentFiles(code, filePath, ctx);

      d(`Using compiler options: ${JSON.stringify(compiler.compilerOptions)}`);
      let result = yield compiler.compile(code, filePath, ctx);

      let shouldInlineHtmlify = inputMimeType !== 'text/html' && result.mimeType === 'text/html';

      let isPassthrough = result.mimeType === 'text/plain' || !result.mimeType || CompilerHost.shouldPassthrough(hashInfo);

      if (finalForms[result.mimeType] && !shouldInlineHtmlify || isPassthrough) {
        // Got something we can use in-browser, let's return it
        return Object.assign(result, { dependentFiles });
      } else {
        d(`Recursively compiling result of ${filePath} with non-final MIME type ${result.mimeType}, input was ${inputMimeType}`);

        hashInfo = Object.assign({ sourceCode: result.code, mimeType: result.mimeType }, hashInfo);
        compiler = _this5.compilersByMimeType[result.mimeType || '__lolnothere'];

        if (!compiler) {
          d(`Recursive compile failed - intermediate result: ${JSON.stringify(result)}`);

          throw new Error(`Compiling ${filePath} resulted in a MIME type of ${result.mimeType}, which we don't know how to handle`);
        }

        return yield _this5.compileUncached(`${filePath}.${_mimeTypes2.default.extension(result.mimeType || 'txt')}`, hashInfo, compiler);
      }
    })();
  }

  /**
   * Pre-caches an entire directory of files recursively. Usually used for
   * building custom compiler tooling.
   *
   * @param  {string} rootDirectory  The top-level directory to compile
   *
   * @param  {Function} shouldCompile (optional)  A Function which allows the
   *                                  caller to disable compiling certain files.
   *                                  It takes a fully-qualified path to a file,
   *                                  and should return a Boolean.
   *
   * @return {Promise}  Completion.
   */
  compileAll(rootDirectory) {
    var _this6 = this;

    let shouldCompile = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    return _asyncToGenerator(function* () {
      let should = shouldCompile || function () {
        return true;
      };

      yield (0, _forAllFiles.forAllFiles)(rootDirectory, function (f) {
        if (!should(f)) return;

        d(`Compiling ${f}`);
        return _this6.compile(f, _this6.compilersByMimeType);
      });
    })();
  }

  listenToCompileEvents() {
    return (0, _browserSignal.listen)('electron-compile-compiled-file').map((_ref3) => {
      var _ref4 = _slicedToArray(_ref3, 1);

      let x = _ref4[0];
      return x;
    });
  }

  /*
   * Sync Methods
   */

  compileSync(filePath) {
    let ret = this.readOnlyMode ? this.compileReadOnlySync(filePath) : this.fullCompileSync(filePath);

    if (ret.mimeType === 'application/javascript') {
      this.mimeTypesToRegister[_mimeTypes2.default.lookup(filePath)] = true;
    }

    return ret;
  }

  static createReadonlyFromConfigurationSync(rootCacheDir, appRoot) {
    let fallbackCompiler = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

    let target = _path2.default.join(rootCacheDir, 'compiler-info.json.gz');
    let buf = _fs2.default.readFileSync(target);
    let info = JSON.parse(_zlib2.default.gunzipSync(buf));

    let fileChangeCache = _fileChangeCache2.default.loadFromData(info.fileChangeCache, appRoot, true);

    let compilers = Object.keys(info.compilers).reduce((acc, x) => {
      let cur = info.compilers[x];
      acc[x] = new _readOnlyCompiler2.default(cur.name, cur.compilerVersion, cur.compilerOptions, cur.inputMimeTypes);

      return acc;
    }, {});

    return new CompilerHost(rootCacheDir, compilers, fileChangeCache, true, fallbackCompiler, null, info.mimeTypesToRegister);
  }

  static createFromConfigurationSync(rootCacheDir, appRoot, compilersByMimeType) {
    let fallbackCompiler = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

    let target = _path2.default.join(rootCacheDir, 'compiler-info.json.gz');
    let buf = _fs2.default.readFileSync(target);
    let info = JSON.parse(_zlib2.default.gunzipSync(buf));

    let fileChangeCache = _fileChangeCache2.default.loadFromData(info.fileChangeCache, appRoot, false);

    Object.keys(info.compilers).forEach(x => {
      let cur = info.compilers[x];
      compilersByMimeType[x].compilerOptions = cur.compilerOptions;
    });

    return new CompilerHost(rootCacheDir, compilersByMimeType, fileChangeCache, false, fallbackCompiler, null, info.mimeTypesToRegister);
  }

  saveConfigurationSync() {
    let serializedCompilerOpts = Object.keys(this.compilersByMimeType).reduce((acc, x) => {
      let compiler = this.compilersByMimeType[x];
      let Klass = Object.getPrototypeOf(compiler).constructor;

      let val = {
        name: Klass.name,
        inputMimeTypes: Klass.getInputMimeTypes(),
        compilerOptions: compiler.compilerOptions,
        compilerVersion: compiler.getCompilerVersion()
      };

      acc[x] = val;
      return acc;
    }, {});

    let info = {
      fileChangeCache: this.fileChangeCache.getSavedData(),
      compilers: serializedCompilerOpts,
      mimeTypesToRegister: this.mimeTypesToRegister
    };

    let target = _path2.default.join(this.rootCacheDir, 'compiler-info.json.gz');
    let buf = _zlib2.default.gzipSync(new Buffer(JSON.stringify(info)));
    _fs2.default.writeFileSync(target, buf);
  }

  compileReadOnlySync(filePath) {
    // We guarantee that node_modules are always shipped directly
    let type = _mimeTypes2.default.lookup(filePath);
    if (_fileChangeCache2.default.isInNodeModules(filePath)) {
      return {
        mimeType: type || 'application/javascript',
        code: _fs2.default.readFileSync(filePath, 'utf8')
      };
    }

    let hashInfo = this.fileChangeCache.getHashForPathSync(filePath);

    // We guarantee that node_modules are always shipped directly
    if (hashInfo.isInNodeModules) {
      return {
        mimeType: type,
        code: hashInfo.sourceCode || _fs2.default.readFileSync(filePath, 'utf8')
      };
    }

    // NB: Here, we're basically only using the compiler here to find
    // the appropriate CompileCache
    let compiler = CompilerHost.shouldPassthrough(hashInfo) ? this.getPassthroughCompiler() : this.compilersByMimeType[type || '__lolnothere'];

    // NB: We don't put this into shouldPassthrough because Inline HTML
    // compiler is technically of type finalForms (i.e. a browser can
    // natively handle this content), yet its compiler is
    // InlineHtmlCompiler. However, we still want to catch standard CSS files
    // which will be processed by PassthroughCompiler.
    if (finalForms[type] && !compiler) {
      compiler = this.getPassthroughCompiler();
    }

    if (!compiler) {
      compiler = this.fallbackCompiler;

      var _compiler$getSync = compiler.getSync(filePath);

      let code = _compiler$getSync.code,
          binaryData = _compiler$getSync.binaryData,
          mimeType = _compiler$getSync.mimeType;

      return { code: code || binaryData, mimeType };
    }

    let cache = this.cachesForCompilers.get(compiler);

    var _cache$getSync = cache.getSync(filePath);

    let code = _cache$getSync.code,
        binaryData = _cache$getSync.binaryData,
        mimeType = _cache$getSync.mimeType;


    code = code || binaryData;
    if (!code || !mimeType) {
      throw new Error(`Asked to compile ${filePath} in production, is this file not precompiled?`);
    }

    return { code, mimeType };
  }

  fullCompileSync(filePath) {
    d(`Compiling ${filePath}`);

    let type = _mimeTypes2.default.lookup(filePath);

    (0, _browserSignal.send)('electron-compile-compiled-file', { filePath, mimeType: type });

    let hashInfo = this.fileChangeCache.getHashForPathSync(filePath);

    if (hashInfo.isInNodeModules) {
      let code = hashInfo.sourceCode || _fs2.default.readFileSync(filePath, 'utf8');
      code = CompilerHost.fixNodeModulesSourceMappingSync(code, filePath, this.fileChangeCache.appRoot);
      return { code, mimeType: type };
    }

    let compiler = CompilerHost.shouldPassthrough(hashInfo) ? this.getPassthroughCompiler() : this.compilersByMimeType[type || '__lolnothere'];

    if (!compiler) {
      d(`Falling back to passthrough compiler for ${filePath}`);
      compiler = this.fallbackCompiler;
    }

    if (!compiler) {
      throw new Error(`Couldn't find a compiler for ${filePath}`);
    }

    let cache = this.cachesForCompilers.get(compiler);
    return cache.getOrFetchSync(filePath, (filePath, hashInfo) => this.compileUncachedSync(filePath, hashInfo, compiler));
  }

  compileUncachedSync(filePath, hashInfo, compiler) {
    let inputMimeType = _mimeTypes2.default.lookup(filePath);

    if (hashInfo.isFileBinary) {
      return {
        binaryData: hashInfo.binaryData || _fs2.default.readFileSync(filePath),
        mimeType: inputMimeType,
        dependentFiles: []
      };
    }

    let ctx = {};
    let code = hashInfo.sourceCode || _fs2.default.readFileSync(filePath, 'utf8');

    if (!compiler.shouldCompileFileSync(code, ctx)) {
      d(`Compiler returned false for shouldCompileFile: ${filePath}`);
      return { code, mimeType: _mimeTypes2.default.lookup(filePath), dependentFiles: [] };
    }

    let dependentFiles = compiler.determineDependentFilesSync(code, filePath, ctx);

    let result = compiler.compileSync(code, filePath, ctx);

    let shouldInlineHtmlify = inputMimeType !== 'text/html' && result.mimeType === 'text/html';

    let isPassthrough = result.mimeType === 'text/plain' || !result.mimeType || CompilerHost.shouldPassthrough(hashInfo);

    if (finalForms[result.mimeType] && !shouldInlineHtmlify || isPassthrough) {
      // Got something we can use in-browser, let's return it
      return Object.assign(result, { dependentFiles });
    } else {
      d(`Recursively compiling result of ${filePath} with non-final MIME type ${result.mimeType}, input was ${inputMimeType}`);

      hashInfo = Object.assign({ sourceCode: result.code, mimeType: result.mimeType }, hashInfo);
      compiler = this.compilersByMimeType[result.mimeType || '__lolnothere'];

      if (!compiler) {
        d(`Recursive compile failed - intermediate result: ${JSON.stringify(result)}`);

        throw new Error(`Compiling ${filePath} resulted in a MIME type of ${result.mimeType}, which we don't know how to handle`);
      }

      return this.compileUncachedSync(`${filePath}.${_mimeTypes2.default.extension(result.mimeType || 'txt')}`, hashInfo, compiler);
    }
  }

  compileAllSync(rootDirectory) {
    let shouldCompile = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

    let should = shouldCompile || function () {
      return true;
    };

    (0, _forAllFiles.forAllFilesSync)(rootDirectory, f => {
      if (!should(f)) return;
      return this.compileSync(f, this.compilersByMimeType);
    });
  }

  /*
   * Other stuff
   */

  /**
   * Returns the passthrough compiler
   *
   * @private
   */
  getPassthroughCompiler() {
    return this.compilersByMimeType['text/plain'];
  }

  /**
   * Determines whether we should even try to compile the content. Note that in
   * some cases, content will still be in cache even if this returns true, and
   * in other cases (isInNodeModules), we'll know explicitly to not even bother
   * looking in the cache.
   *
   * @private
   */
  static shouldPassthrough(hashInfo) {
    return hashInfo.isMinified || hashInfo.isInNodeModules || hashInfo.hasSourceMap || hashInfo.isFileBinary;
  }

  /**
   * Look at the code of a node modules and see the sourceMapping path.
   * If there is any, check the path and try to fix it with and
   * root relative path.
   * @private
   */
  static fixNodeModulesSourceMapping(sourceCode, sourcePath, appRoot) {
    return _asyncToGenerator(function* () {
      let regexSourceMapping = /\/\/#.*sourceMappingURL=(?!data:)([^"'].*)/i;
      let sourceMappingCheck = sourceCode.match(regexSourceMapping);

      if (sourceMappingCheck && sourceMappingCheck[1] && sourceMappingCheck[1] !== '') {
        let sourceMapPath = sourceMappingCheck[1];

        try {
          yield _promise.pfs.stat(sourceMapPath);
        } catch (error) {
          let normRoot = _path2.default.normalize(appRoot);
          let absPathToModule = _path2.default.dirname(sourcePath.replace(normRoot, '').substring(1));
          let newMapPath = _path2.default.join(absPathToModule, sourceMapPath);

          return sourceCode.replace(regexSourceMapping, `//# sourceMappingURL=${newMapPath}`);
        }
      }

      return sourceCode;
    })();
  }

  /**
   * Look at the code of a node modules and see the sourceMapping path.
   * If there is any, check the path and try to fix it with and
   * root relative path.
   * @private
   */
  static fixNodeModulesSourceMappingSync(sourceCode, sourcePath, appRoot) {
    let regexSourceMapping = /\/\/#.*sourceMappingURL=(?!data:)([^"'].*)/i;
    let sourceMappingCheck = sourceCode.match(regexSourceMapping);

    if (sourceMappingCheck && sourceMappingCheck[1] && sourceMappingCheck[1] !== '') {
      let sourceMapPath = sourceMappingCheck[1];

      try {
        _fs2.default.statSync(sourceMapPath);
      } catch (error) {
        let normRoot = _path2.default.normalize(appRoot);
        let absPathToModule = _path2.default.dirname(sourcePath.replace(normRoot, '').substring(1));
        let newMapPath = _path2.default.join(absPathToModule, sourceMapPath);

        return sourceCode.replace(regexSourceMapping, `//# sourceMappingURL=${newMapPath}`);
      }
    }

    return sourceCode;
  }
}
exports.default = CompilerHost;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jb21waWxlci1ob3N0LmpzIl0sIm5hbWVzIjpbImQiLCJyZXF1aXJlIiwiaW5pdCIsImZpbmFsRm9ybXMiLCJDb21waWxlckhvc3QiLCJjb25zdHJ1Y3RvciIsInJvb3RDYWNoZURpciIsImNvbXBpbGVycyIsImZpbGVDaGFuZ2VDYWNoZSIsInJlYWRPbmx5TW9kZSIsImZhbGxiYWNrQ29tcGlsZXIiLCJzb3VyY2VNYXBQYXRoIiwibWltZVR5cGVzVG9SZWdpc3RlciIsImNvbXBpbGVyc0J5TWltZVR5cGUiLCJPYmplY3QiLCJhc3NpZ24iLCJhcHBSb290IiwiY2FjaGVzRm9yQ29tcGlsZXJzIiwia2V5cyIsInJlZHVjZSIsImFjYyIsIngiLCJjb21waWxlciIsImhhcyIsInNldCIsIkNvbXBpbGVDYWNoZSIsImNyZWF0ZUZyb21Db21waWxlciIsIk1hcCIsImNyZWF0ZVJlYWRvbmx5RnJvbUNvbmZpZ3VyYXRpb24iLCJ0YXJnZXQiLCJwYXRoIiwiam9pbiIsImJ1ZiIsInBmcyIsInJlYWRGaWxlIiwiaW5mbyIsIkpTT04iLCJwYXJzZSIsInB6bGliIiwiZ3VuemlwIiwiRmlsZUNoYW5nZWRDYWNoZSIsImxvYWRGcm9tRGF0YSIsImN1ciIsIlJlYWRPbmx5Q29tcGlsZXIiLCJuYW1lIiwiY29tcGlsZXJWZXJzaW9uIiwiY29tcGlsZXJPcHRpb25zIiwiaW5wdXRNaW1lVHlwZXMiLCJjcmVhdGVGcm9tQ29uZmlndXJhdGlvbiIsImZvckVhY2giLCJzYXZlQ29uZmlndXJhdGlvbiIsInNlcmlhbGl6ZWRDb21waWxlck9wdHMiLCJLbGFzcyIsImdldFByb3RvdHlwZU9mIiwidmFsIiwiZ2V0SW5wdXRNaW1lVHlwZXMiLCJnZXRDb21waWxlclZlcnNpb24iLCJnZXRTYXZlZERhdGEiLCJnemlwIiwiQnVmZmVyIiwic3RyaW5naWZ5Iiwid3JpdGVGaWxlIiwiY29tcGlsZSIsImZpbGVQYXRoIiwicmV0IiwiY29tcGlsZVJlYWRPbmx5IiwiZnVsbENvbXBpbGUiLCJtaW1lVHlwZSIsIm1pbWVUeXBlcyIsImxvb2t1cCIsInR5cGUiLCJpc0luTm9kZU1vZHVsZXMiLCJjb2RlIiwiaGFzaEluZm8iLCJnZXRIYXNoRm9yUGF0aCIsInNob3VsZFBhc3N0aHJvdWdoIiwiZ2V0UGFzc3Rocm91Z2hDb21waWxlciIsImdldCIsImJpbmFyeURhdGEiLCJjYWNoZSIsIkVycm9yIiwic291cmNlQ29kZSIsImZpeE5vZGVNb2R1bGVzU291cmNlTWFwcGluZyIsImdldE9yRmV0Y2giLCJjb21waWxlVW5jYWNoZWQiLCJpbnB1dE1pbWVUeXBlIiwiaXNGaWxlQmluYXJ5IiwiZGVwZW5kZW50RmlsZXMiLCJjdHgiLCJzaG91bGRDb21waWxlRmlsZSIsImRldGVybWluZURlcGVuZGVudEZpbGVzIiwicmVzdWx0Iiwic2hvdWxkSW5saW5lSHRtbGlmeSIsImlzUGFzc3Rocm91Z2giLCJleHRlbnNpb24iLCJjb21waWxlQWxsIiwicm9vdERpcmVjdG9yeSIsInNob3VsZENvbXBpbGUiLCJzaG91bGQiLCJmIiwibGlzdGVuVG9Db21waWxlRXZlbnRzIiwibWFwIiwiY29tcGlsZVN5bmMiLCJjb21waWxlUmVhZE9ubHlTeW5jIiwiZnVsbENvbXBpbGVTeW5jIiwiY3JlYXRlUmVhZG9ubHlGcm9tQ29uZmlndXJhdGlvblN5bmMiLCJmcyIsInJlYWRGaWxlU3luYyIsInpsaWIiLCJndW56aXBTeW5jIiwiY3JlYXRlRnJvbUNvbmZpZ3VyYXRpb25TeW5jIiwic2F2ZUNvbmZpZ3VyYXRpb25TeW5jIiwiZ3ppcFN5bmMiLCJ3cml0ZUZpbGVTeW5jIiwiZ2V0SGFzaEZvclBhdGhTeW5jIiwiZ2V0U3luYyIsImZpeE5vZGVNb2R1bGVzU291cmNlTWFwcGluZ1N5bmMiLCJnZXRPckZldGNoU3luYyIsImNvbXBpbGVVbmNhY2hlZFN5bmMiLCJzaG91bGRDb21waWxlRmlsZVN5bmMiLCJkZXRlcm1pbmVEZXBlbmRlbnRGaWxlc1N5bmMiLCJjb21waWxlQWxsU3luYyIsImlzTWluaWZpZWQiLCJoYXNTb3VyY2VNYXAiLCJzb3VyY2VQYXRoIiwicmVnZXhTb3VyY2VNYXBwaW5nIiwic291cmNlTWFwcGluZ0NoZWNrIiwibWF0Y2giLCJzdGF0IiwiZXJyb3IiLCJub3JtUm9vdCIsIm5vcm1hbGl6ZSIsImFic1BhdGhUb01vZHVsZSIsImRpcm5hbWUiLCJyZXBsYWNlIiwic3Vic3RyaW5nIiwibmV3TWFwUGF0aCIsInN0YXRTeW5jIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7O0FBRUE7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7O0FBSUE7Ozs7OztBQUZBLE1BQU1BLElBQUlDLFFBQVEsT0FBUixFQUFpQixnQ0FBakIsQ0FBVjs7QUFJQUEsUUFBUSxrQkFBUixFQUE0QkMsSUFBNUI7O0FBRUE7QUFDQSxNQUFNQyxhQUFhO0FBQ2pCLHFCQUFtQixJQURGO0FBRWpCLDRCQUEwQixJQUZUO0FBR2pCLGVBQWEsSUFISTtBQUlqQixjQUFZLElBSks7QUFLakIsbUJBQWlCLElBTEE7QUFNakIsc0JBQW9CO0FBTkgsQ0FBbkI7O0FBU0E7Ozs7Ozs7Ozs7Ozs7O0FBY2UsTUFBTUMsWUFBTixDQUFtQjtBQUNoQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBOEJBQyxjQUFZQyxZQUFaLEVBQTBCQyxTQUExQixFQUFxQ0MsZUFBckMsRUFBc0RDLFlBQXRELEVBQStJO0FBQUEsUUFBM0VDLGdCQUEyRSx1RUFBeEQsSUFBd0Q7QUFBQSxRQUFsREMsYUFBa0QsdUVBQWxDLElBQWtDO0FBQUEsUUFBNUJDLG1CQUE0Qix1RUFBTixJQUFNOztBQUM3SSxRQUFJQyxzQkFBc0JDLE9BQU9DLE1BQVAsQ0FBYyxFQUFkLEVBQWtCUixTQUFsQixDQUExQjtBQUNBTyxXQUFPQyxNQUFQLENBQWMsSUFBZCxFQUFvQixFQUFDVCxZQUFELEVBQWVPLG1CQUFmLEVBQW9DTCxlQUFwQyxFQUFxREMsWUFBckQsRUFBbUVDLGdCQUFuRSxFQUFwQjtB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Q0FBcEI7O0FBRUEsVUFBSTtBQUNGcEIscUJBQUcrQixRQUFILENBQVk5SCxhQUFaO0FBQ0QsT0FGRCxDQUVFLE9BQU9zSCxLQUFQLEVBQWM7QUFDZCxZQUFJQyxXQUFXcEcsZUFBS3FHLFNBQUwsQ0FBZW5ILE9BQWYsQ0FBZjtBQUNBLFlBQUlvSCxrQkFBa0J0RyxlQUFLdUcsT0FBTCxDQUFhVCxXQUFXVSxPQUFYLENBQW1CSixRQUFuQixFQUE2QixFQUE3QixFQUFpQ0ssU0FBakMsQ0FBMkMsQ0FBM0MsQ0FBYixDQUF0QjtBQUNBLFlBQUlDLGFBQWExRyxlQUFLQyxJQUFMLENBQVVxRyxlQUFWLEVBQTJCekgsYUFBM0IsQ0FBakI7O0FBRUEsZUFBT3NFLFdBQVdxRCxPQUFYLENBQW1CVCxrQkFBbkIsRUFBd0Msd0JBQXVCVyxVQUFXLEVBQTFFLENBQVA7QUFDRDtBQUNGOztBQUVELFdBQU92RCxVQUFQO0FBQ0Q7QUE1cEIrQjtrQkFBYjdFLFkiLCJmaWxlIjoiY29tcGlsZXItaG9zdC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBtaW1lVHlwZXMgZnJvbSAnQHBhdWxjYmV0dHMvbWltZS10eXBlcyc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHpsaWIgZnJvbSAnemxpYic7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7cGZzLCBwemxpYn0gZnJvbSAnLi9wcm9taXNlJztcblxuaW1wb3J0IHtmb3JBbGxGaWxlcywgZm9yQWxsRmlsZXNTeW5jfSBmcm9tICcuL2Zvci1hbGwtZmlsZXMnO1xuaW1wb3J0IENvbXBpbGVDYWNoZSBmcm9tICcuL2NvbXBpbGUtY2FjaGUnO1xuaW1wb3J0IEZpbGVDaGFuZ2VkQ2FjaGUgZnJvbSAnLi9maWxlLWNoYW5nZS1jYWNoZSc7XG5pbXBvcnQgUmVhZE9ubHlDb21waWxlciBmcm9tICcuL3JlYWQtb25seS1jb21waWxlcic7XG5pbXBvcnQge2xpc3Rlbiwgc2VuZH0gZnJvbSAnLi9icm93c2VyLXNpZ25hbCc7XG5cbmNvbnN0IGQgPSByZXF1aXJlKCdkZWJ1ZycpKCdlbGVjdHJvbi1jb21waWxlOmNvbXBpbGVyLWhvc3QnKTtcblxuaW1wb3J0ICdyeGpzL2FkZC9vcGVyYXRvci9tYXAnO1xuXG5yZXF1aXJlKCcuL3JpZy1taW1lLXR5cGVzJykuaW5pdCgpO1xuXG4vLyBUaGlzIGlzbid0IGV2ZW4gbXlcbmNvbnN0IGZpbmFsRm9ybXMgPSB7XG4gICd0ZXh0L2phdmFzY3JpcHQnOiB0cnVlLFxuICAnYXBwbGljYXRpb24vamF2YXNjcmlwdCc6IHRydWUsXG4gICd0ZXh0L2h0bWwnOiB0cnVlLFxuICAndGV4dC9jc3MnOiB0cnVlLFxuICAnaW1hZ2Uvc3ZnK3htbCc6IHRydWUsXG4gICdhcHBsaWNhdGlvbi9qc29uJzogdHJ1ZVxufTtcblxuLyoqXG4gKiBUaGlzIGNsYXNzIGlzIHRoZSB0b3AtbGV2ZWwgY2xhc3MgdGhhdCBlbmNhcHN1bGF0ZXMgYWxsIG9mIHRoZSBsb2dpYyBvZlxuICogY29tcGlsaW5nIGFuZCBjYWNoaW5nIGFwcGxpY2F0aW9uIGNvZGUuIElmIHlvdSdyZSBsb29raW5nIGZvciBhIFwiTWFpbiBjbGFzc1wiLFxuICogdGhpcyBpcyBpdC5cbiAqXG4gKiBUaGlzIGNsYXNzIGNhbiBiZSBjcmVhdGVkIGRpcmVjdGx5IGJ1dCBpdCBpcyB1c3VhbGx5IGNyZWF0ZWQgdmlhIHRoZSBtZXRob2RzXG4gKiBpbiBjb25maWctcGFyc2VyLCB3aGljaCB3aWxsIGFtb25nIG90aGVyIHRoaW5ncywgc2V0IHVwIHRoZSBjb21waWxlciBvcHRpb25zXG4gKiBnaXZlbiBhIHByb2plY3Qgcm9vdC5cbiAqXG4gKiBDb21waWxlckhvc3QgaXMgYWxzbyB0aGUgdG9wLWxldmVsIGNsYXNzIHRoYXQga25vd3MgaG93IHRvIHNlcmlhbGl6ZSBhbGwgb2YgdGhlXG4gKiBpbmZvcm1hdGlvbiBuZWNlc3NhcnkgdG8gcmVjcmVhdGUgaXRzZWxmLCBlaXRoZXIgYXMgYSBkZXZlbG9wbWVudCBob3N0IChpLmUuXG4gKiB3aWxsIGFsbG93IGNhY2hlIG1pc3NlcyBhbmQgYWN0dWFsIGNvbXBpbGF0aW9uKSwgb3IgYXMgYSByZWFkLW9ubHkgdmVyc2lvbiBvZlxuICogaXRzZWxmIGZvciBwcm9kdWN0aW9uLlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDb21waWxlckhvc3Qge1xuICAvKipcbiAgICogQ3JlYXRlcyBhbiBpbnN0YW5jZSBvZiBDb21waWxlckhvc3QuIFlvdSBwcm9iYWJseSB3YW50IHRvIHVzZSB0aGUgbWV0aG9kc1xuICAgKiBpbiBjb25maWctcGFyc2VyIGZvciBkZXZlbG9wbWVudCwgb3Ige0BsaW5rIGNyZWF0ZVJlYWRvbmx5RnJvbUNvbmZpZ3VyYXRpb259XG4gICAqIGZvciBwcm9kdWN0aW9uIGluc3RlYWQuXG4gICAqXG4gICAqIEBwYXJhbSAge3N0cmluZ30gcm9vdENhY2hlRGlyICBUaGUgcm9vdCBkaXJlY3RvcnkgdG8gdXNlIGZvciB0aGUgY2FjaGVcbiAgICpcbiAgICogQHBhcmFtICB7T2JqZWN0fSBjb21waWxlcnMgIGFuIE9iamVjdCB3aG9zZSBrZXlzIGFyZSBpbnB1dCBNSU1FIHR5cGVzIGFuZFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hvc2UgdmFsdWVzIGFyZSBpbnN0YW5jZXMgb2YgQ29tcGlsZXJCYXNlLiBDcmVhdGVcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMgdmlhIHRoZSB7QGxpbmsgY3JlYXRlQ29tcGlsZXJzfSBtZXRob2QgaW5cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZy1wYXJzZXIuXG4gICAqXG4gICAqIEBwYXJhbSAge0ZpbGVDaGFuZ2VkQ2FjaGV9IGZpbGVDaGFuZ2VDYWNoZSAgQSBmaWxlLWNoYW5nZSBjYWNoZSB0aGF0IGlzXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9uYWxseSBwcmUtbG9hZGVkLlxuICAgKlxuICAgKiBAcGFyYW0gIHtib29sZWFufSByZWFkT25seU1vZGUgIElmIFRydWUsIGNhY2hlIG1pc3NlcyB3aWxsIGZhaWwgYW5kXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcGlsYXRpb24gd2lsbCBub3QgYmUgYXR0ZW1wdGVkLlxuICAgKlxuICAgKiBAcGFyYW0gIHtDb21waWxlckJhc2V9IGZhbGxiYWNrQ29tcGlsZXIgKG9wdGlvbmFsKSAgV2hlbiBhIGZpbGUgaXMgY29tcGlsZWRcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWNoIGRvZXNuJ3QgaGF2ZSBhIG1hdGNoaW5nIGNvbXBpbGVyLFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcyBjb21waWxlciB3aWxsIGJlIHVzZWQgaW5zdGVhZC4gSWZcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bGwsIHdpbGwgZmFpbCBjb21waWxhdGlvbi4gQSBnb29kXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbHRlcm5hdGUgZmFsbGJhY2sgaXMgdGhlIGNvbXBpbGVyIGZvclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3RleHQvcGxhaW4nLCB3aGljaCBpcyBndWFyYW50ZWVkIHRvIGJlXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmVzZW50LlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gc291cmNlTWFwUGF0aCAob3B0aW9uYWwpIFRoZSBkaXJlY3RvcnkgdG8gc3RvcmUgc291cmNlbWFwIHNlcGFyYXRlbHlcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgY29tcGlsZXIgb3B0aW9uIGVuYWJsZWQgdG8gZW1pdC5cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRGVmYXVsdCB0byBjYWNoZVBhdGggaWYgbm90IHNwZWNpZmllZC5cbiAgICovXG4gIGNvbnN0cnVjdG9yKHJvb3RDYWNoZURpciwgY29tcGlsZXJzLCBmaWxlQ2hhbmdlQ2FjaGUsIHJlYWRPbmx5TW9kZSwgZmFsbGJhY2tDb21waWxlciA9IG51bGwsIHNvdXJjZU1hcFBhdGggPSBudWxsLCBtaW1lVHlwZXNUb1JlZ2lzdGVyID0gbnVsbCkge1xuICAgIGxldCBjb21waWxlcnNCeU1pbWVUeXBlID0gT2JqZWN0LmFzc2lnbih7fSwgY29tcGlsZXJzKTtcbiAgICBPYmplY3QuYXNzaWduKHRoaXMsIHtyb290Q2FjaGVEaXIsIGNvbXBpbGVyc0J5TWltZVR5cGUsIGZpbGVDaGFuZ2VDYWNoZSwgcmVhZE9ubHlNb2RlLCBmYWxsYmFja0NvbXBpbGVyfSk7XG4gICAgdGhpcy5hcHBSb290ID0gdGhpcy5maWxlQ2hhbmdlQ2FjaGUuYXBwUm9vdDtcblxuICAgIHRoaXMuY2FjaGVzRm9yQ29tcGlsZXJzID0gT2JqZWN0LmtleXMoY29tcGlsZXJzQnlNaW1lVHlwZSkucmVkdWNlKChhY2MsIHgpID0+IHtcbiAgICAgIGxldCBjb21waWxlciA9IGNvbXBpbGVyc0J5TWltZVR5cGVbeF07XG4gICAgICBpZiAoYWNjLmhhcyhjb21waWxlcikpIHJldHVybiBhY2M7XG5cbiAgICAgIGFjYy5zZXQoXG4gICAgICAgIGNvbXBpbGVyLFxuICAgICAgICBDb21waWxlQ2FjaGUuY3JlYXRlRnJvbUNvbXBpbGVyKHJvb3RDYWNoZURpciwgY29tcGlsZXIsIGZpbGVDaGFuZ2VDYWNoZSwgcmVhZE9ubHlNb2RlLCBzb3VyY2VNYXBQYXRoKSk7XG4gICAgICByZXR1cm4gYWNjO1xuICAgIH0sIG5ldyBNYXAoKSk7XG5cbiAgICB0aGlzLm1pbWVUeXBlc1RvUmVnaXN0ZXIgPSBtaW1lVHlwZXNUb1JlZ2lzdGVyIHx8IHt9O1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBwcm9kdWN0aW9uLW1vZGUgQ29tcGlsZXJIb3N0IGZyb20gdGhlIHByZXZpb3VzbHkgc2F2ZWRcbiAgICogY29uZmlndXJhdGlvblxuICAgKlxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IHJvb3RDYWNoZURpciAgVGhlIHJvb3QgZGlyZWN0b3J5IHRvIHVzZSBmb3IgdGhlIGNhY2hlLiBUaGlzXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWNoZSBtdXN0IGhhdmUgY2FjaGUgaW5mb3JtYXRpb24gc2F2ZWQgdmlhXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7QGxpbmsgc2F2ZUNvbmZpZ3VyYXRpb259XG4gICAqXG4gICAqIEBwYXJhbSAge3N0cmluZ30gYXBwUm9vdCAgVGhlIHRvcC1sZXZlbCBkaXJlY3RvcnkgZm9yIHlvdXIgYXBwbGljYXRpb24gKGkuZS5cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICB0aGUgb25lIHdoaWNoIGhhcyB5b3VyIHBhY2thZ2UuanNvbikuXG4gICAqXG4gICAqIEBwYXJhbSAge0NvbXBpbGVyQmFzZX0gZmFsbGJhY2tDb21waWxlciAob3B0aW9uYWwpICBXaGVuIGEgZmlsZSBpcyBjb21waWxlZFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpY2ggZG9lc24ndCBoYXZlIGEgbWF0Y2hpbmcgY29tcGlsZXIsXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzIGNvbXBpbGVyIHdpbGwgYmUgdXNlZCBpbnN0ZWFkLiBJZlxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbnVsbCwgd2lsbCBmYWlsIGNvbXBpbGF0aW9uLiBBIGdvb2RcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsdGVybmF0ZSBmYWxsYmFjayBpcyB0aGUgY29tcGlsZXIgZm9yXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAndGV4dC9wbGFpbicsIHdoaWNoIGlzIGd1YXJhbnRlZWQgdG8gYmVcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZXNlbnQuXG4gICAqXG4gICAqIEByZXR1cm4ge1Byb21pc2U8Q29tcGlsZXJIb3N0Pn0gIEEgcmVhZC1vbmx5IENvbXBpbGVySG9zdFxuICAgKi9cbiAgc3RhdGljIGFzeW5jIGNyZWF0ZVJlYWRvbmx5RnJvbUNvbmZpZ3VyYXRpb24ocm9vdENhY2hlRGlyLCBhcHBSb290LCBmYWxsYmFja0NvbXBpbGVyPW51bGwpIHtcbiAgICBsZXQgdGFyZ2V0ID0gcGF0aC5qb2luKHJvb3RDYWNoZURpciwgJ2NvbXBpbGVyLWluZm8uanNvbi5neicpO1xuICAgIGxldCBidWYgPSBhd2FpdCBwZnMucmVhZEZpbGUodGFyZ2V0KTtcbiAgICBsZXQgaW5mbyA9IEpTT04ucGFyc2UoYXdhaXQgcHpsaWIuZ3VuemlwKGJ1ZikpO1xuXG4gICAgbGV0IGZpbGVDaGFuZ2VDYWNoZSA9IEZpbGVDaGFuZ2VkQ2FjaGUubG9hZEZyb21EYXRhKGluZm8uZmlsZUNoYW5nZUNhY2hlLCBhcHBSb290LCB0cnVlKTtcblxuICAgIGxldCBjb21waWxlcnMgPSBPYmplY3Qua2V5cyhpbmZvLmNvbXBpbGVycykucmVkdWNlKChhY2MsIHgpID0+IHtcbiAgICAgIGxldCBjdXIgPSBpbmZvLmNvbXBpbGVyc1t4XTtcbiAgICAgIGFjY1t4XSA9IG5ldyBSZWFkT25seUNvbXBpbGVyKGN1ci5uYW1lLCBjdXIuY29tcGlsZXJWZXJzaW9uLCBjdXIuY29tcGlsZXJPcHRpb25zLCBjdXIuaW5wdXRNaW1lVHlwZXMpO1xuXG4gICAgICByZXR1cm4gYWNjO1xuICAgIH0sIHt9KTtcblxuICAgIHJldHVybiBuZXcgQ29tcGlsZXJIb3N0KHJvb3RDYWNoZURpciwgY29tcGlsZXJzLCBmaWxlQ2hhbmdlQ2FjaGUsIHRydWUsIGZhbGxiYWNrQ29tcGlsZXIsIG51bGwsIGluZm8ubWltZVR5cGVzVG9SZWdpc3Rlcik7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIGRldmVsb3BtZW50LW1vZGUgQ29tcGlsZXJIb3N0IGZyb20gdGhlIHByZXZpb3VzbHkgc2F2ZWRcbiAgICogY29uZmlndXJhdGlvbi5cbiAgICpcbiAgICogQHBhcmFtICB7c3RyaW5nfSByb290Q2FjaGVEaXIgIFRoZSByb290IGRpcmVjdG9yeSB0byB1c2UgZm9yIHRoZSBjYWNoZS4gVGhpc1xuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FjaGUgbXVzdCBoYXZlIGNhY2hlIGluZm9ybWF0aW9uIHNhdmVkIHZpYVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge0BsaW5rIHNhdmVDb25maWd1cmF0aW9ufVxuICAgKlxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IGFwcFJvb3QgIFRoZSB0b3AtbGV2ZWwgZGlyZWN0b3J5IGZvciB5b3VyIGFwcGxpY2F0aW9uIChpLmUuXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlIG9uZSB3aGljaCBoYXMgeW91ciBwYWNrYWdlLmpzb24pLlxuICAgKlxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGNvbXBpbGVyc0J5TWltZVR5cGUgIGFuIE9iamVjdCB3aG9zZSBrZXlzIGFyZSBpbnB1dCBNSU1FXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZXMgYW5kIHdob3NlIHZhbHVlcyBhcmUgaW5zdGFuY2VzXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2YgQ29tcGlsZXJCYXNlLiBDcmVhdGUgdGhpcyB2aWEgdGhlXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge0BsaW5rIGNyZWF0ZUNvbXBpbGVyc30gbWV0aG9kIGluXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlnLXBhcnNlci5cbiAgICpcbiAgICogQHBhcmFtICB7Q29tcGlsZXJCYXNlfSBmYWxsYmFja0NvbXBpbGVyIChvcHRpb25hbCkgIFdoZW4gYSBmaWxlIGlzIGNvbXBpbGVkXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aGljaCBkb2Vzbid0IGhhdmUgYSBtYXRjaGluZyBjb21waWxlcixcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMgY29tcGlsZXIgd2lsbCBiZSB1c2VkIGluc3RlYWQuIElmXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBudWxsLCB3aWxsIGZhaWwgY29tcGlsYXRpb24uIEEgZ29vZFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWx0ZXJuYXRlIGZhbGxiYWNrIGlzIHRoZSBjb21waWxlciBmb3JcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICd0ZXh0L3BsYWluJywgd2hpY2ggaXMgZ3VhcmFudGVlZCB0byBiZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJlc2VudC5cbiAgICpcbiAgICogQHJldHVybiB7UHJvbWlzZTxDb21waWxlckhvc3Q+fSAgQSByZWFkLW9ubHkgQ29tcGlsZXJIb3N0XG4gICAqL1xuICBzdGF0aWMgYXN5bmMgY3JlYXRlRnJvbUNvbmZpZ3VyYXRpb24ocm9vdENhY2hlRGlyLCBhcHBSb290LCBjb21waWxlcnNCeU1pbWVUeXBlLCBmYWxsYmFja0NvbXBpbGVyPW51bGwpIHtcbiAgICBsZXQgdGFyZ2V0ID0gcGF0aC5qb2luKHJvb3RDYWNoZURpciwgJ2NvbXBpbGVyLWluZm8uanNvbi5neicpO1xuICAgIGxldCBidWYgPSBhd2FpdCBwZnMucmVhZEZpbGUodGFyZ2V0KTtcbiAgICBsZXQgaW5mbyA9IEpTT04ucGFyc2UoYXdhaXQgcHpsaWIuZ3VuemlwKGJ1ZikpO1xuXG4gICAgbGV0IGZpbGVDaGFuZ2VDYWNoZSA9IEZpbGVDaGFuZ2VkQ2FjaGUubG9hZEZyb21EYXRhKGluZm8uZmlsZUNoYW5nZUNhY2hlLCBhcHBSb290LCBmYWxzZSk7XG5cbiAgICBPYmplY3Qua2V5cyhpbmZvLmNvbXBpbGVycykuZm9yRWFjaCgoeCkgPT4ge1xuICAgICAgbGV0IGN1ciA9IGluZm8uY29tcGlsZXJzW3hdO1xuICAgICAgY29tcGlsZXJzQnlNaW1lVHlwZVt4XS5jb21waWxlck9wdGlvbnMgPSBjdXIuY29tcGlsZXJPcHRpb25zO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5ldyBDb21waWxlckhvc3Qocm9vdENhY2hlRGlyLCBjb21waWxlcnNCeU1pbWVUeXBlLCBmaWxlQ2hhbmdlQ2FjaGUsIGZhbHNlLCBmYWxsYmFja0NvbXBpbGVyLCBudWxsLCBpbmZvLm1pbWVUeXBlc1RvUmVnaXN0ZXIpO1xuICB9XG5cblxuICAvKipcbiAgICogU2F2ZXMgdGhlIGN1cnJlbnQgY29tcGlsZXIgY29uZmlndXJhdGlvbiB0byBhIGZpbGUgdGhhdFxuICAgKiB7QGxpbmsgY3JlYXRlUmVhZG9ubHlGcm9tQ29uZmlndXJhdGlvbn0gY2FuIHVzZSB0byByZWNyZWF0ZSB0aGUgY3VycmVudFxuICAgKiBjb21waWxlciBlbnZpcm9ubWVudFxuICAgKlxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSAgQ29tcGxldGlvblxuICAgKi9cbiAgYXN5bmMgc2F2ZUNvbmZpZ3VyYXRpb24oKSB7XG4gICAgbGV0IHNlcmlhbGl6ZWRDb21waWxlck9wdHMgPSBPYmplY3Qua2V5cyh0aGlzLmNvbXBpbGVyc0J5TWltZVR5cGUpLnJlZHVjZSgoYWNjLCB4KSA9PiB7XG4gICAgICBsZXQgY29tcGlsZXIgPSB0aGlzLmNvbXBpbGVyc0J5TWltZVR5cGVbeF07XG4gICAgICBsZXQgS2xhc3MgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoY29tcGlsZXIpLmNvbnN0cnVjdG9yO1xuXG4gICAgICBsZXQgdmFsID0ge1xuICAgICAgICBuYW1lOiBLbGFzcy5uYW1lLFxuICAgICAgICBpbnB1dE1pbWVUeXBlczogS2xhc3MuZ2V0SW5wdXRNaW1lVHlwZXMoKSxcbiAgICAgICAgY29tcGlsZXJPcHRpb25zOiBjb21waWxlci5jb21waWxlck9wdGlvbnMsXG4gICAgICAgIGNvbXBpbGVyVmVyc2lvbjogY29tcGlsZXIuZ2V0Q29tcGlsZXJWZXJzaW9uKClcbiAgICAgIH07XG5cbiAgICAgIGFjY1t4XSA9IHZhbDtcbiAgICAgIHJldHVybiBhY2M7XG4gICAgfSwge30pO1xuXG4gICAgbGV0IGluZm8gPSB7XG4gICAgICBmaWxlQ2hhbmdlQ2FjaGU6IHRoaXMuZmlsZUNoYW5nZUNhY2hlLmdldFNhdmVkRGF0YSgpLFxuICAgICAgY29tcGlsZXJzOiBzZXJpYWxpemVkQ29tcGlsZXJPcHRzLFxuICAgICAgbWltZVR5cGVzVG9SZWdpc3RlcjogdGhpcy5taW1lVHlwZXNUb1JlZ2lzdGVyXG4gICAgfTtcblxuICAgIGxldCB0YXJnZXQgPSBwYXRoLmpvaW4odGhpcy5yb290Q2FjaGVEaXIsICdjb21waWxlci1pbmZvLmpzb24uZ3onKTtcbiAgICBsZXQgYnVmID0gYXdhaXQgcHpsaWIuZ3ppcChuZXcgQnVmZmVyKEpTT04uc3RyaW5naWZ5KGluZm8pKSk7XG4gICAgYXdhaXQgcGZzLndyaXRlRmlsZSh0YXJnZXQsIGJ1Zik7XG4gIH1cblxuICAvKipcbiAgICogQ29tcGlsZXMgYSBmaWxlIGFuZCByZXR1cm5zIHRoZSBjb21waWxlZCByZXN1bHQuXG4gICAqXG4gICAqIEBwYXJhbSAge3N0cmluZ30gZmlsZVBhdGggIFRoZSBwYXRoIHRvIHRoZSBmaWxlIHRvIGNvbXBpbGVcbiAgICpcbiAgICogQHJldHVybiB7UHJvbWlzZTxvYmplY3Q+fSAgQW4gT2JqZWN0IHdpdGggdGhlIGNvbXBpbGVkIHJlc3VsdFxuICAgKlxuICAgKiBAcHJvcGVydHkge09iamVjdH0gaGFzaEluZm8gIFRoZSBoYXNoIGluZm9ybWF0aW9uIHJldHVybmVkIGZyb20gZ2V0SGFzaEZvclBhdGhcbiAgICogQHByb3BlcnR5IHtzdHJpbmd9IGNvZGUgIFRoZSBzb3VyY2UgY29kZSBpZiB0aGUgZmlsZSB3YXMgYSB0ZXh0IGZpbGVcbiAgICogQHByb3BlcnR5IHtCdWZmZXJ9IGJpbmFyeURhdGEgIFRoZSBmaWxlIGlmIGl0IHdhcyBhIGJpbmFyeSBmaWxlXG4gICAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBtaW1lVHlwZSAgVGhlIE1JTUUgdHlwZSBzYXZlZCBpbiB0aGUgY2FjaGUuXG4gICAqIEBwcm9wZXJ0eSB7c3RyaW5nW119IGRlcGVuZGVudEZpbGVzICBUaGUgZGVwZW5kZW50IGZpbGVzIHJldHVybmVkIGZyb21cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBpbGluZyB0aGUgZmlsZSwgaWYgYW55LlxuICAgKi9cbiAgYXN5bmMgY29tcGlsZShmaWxlUGF0aCkge1xuICAgIGxldCByZXQgPSBhd2FpdCAodGhpcy5yZWFkT25seU1vZGUgPyB0aGlzLmNvbXBpbGVSZWFkT25seShmaWxlUGF0aCkgOiB0aGlzLmZ1bGxDb21waWxlKGZpbGVQYXRoKSk7XG5cbiAgICBpZiAocmV0Lm1pbWVUeXBlID09PSAnYXBwbGljYXRpb24vamF2YXNjcmlwdCcpIHtcbiAgICAgIHRoaXMubWltZVR5cGVzVG9SZWdpc3RlclttaW1lVHlwZXMubG9va3VwKGZpbGVQYXRoKV0gPSB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBIYW5kbGVzIGNvbXBpbGF0aW9uIGluIHJlYWQtb25seSBtb2RlXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBhc3luYyBjb21waWxlUmVhZE9ubHkoZmlsZVBhdGgpIHtcbiAgICAvLyBXZSBndWFyYW50ZWUgdGhhdCBub2RlX21vZHVsZXMgYXJlIGFsd2F5cyBzaGlwcGVkIGRpcmVjdGx5XG4gICAgbGV0IHR5cGUgPSBtaW1lVHlwZXMubG9va3VwKGZpbGVQYXRoKTtcbiAgICBpZiAoRmlsZUNoYW5nZWRDYWNoZS5pc0luTm9kZU1vZHVsZXMoZmlsZVBhdGgpKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBtaW1lVHlwZTogdHlwZSB8fCAnYXBwbGljYXRpb24vamF2YXNjcmlwdCcsXG4gICAgICAgIGNvZGU6IGF3YWl0IHBmcy5yZWFkRmlsZShmaWxlUGF0aCwgJ3V0ZjgnKVxuICAgICAgfTtcbiAgICB9XG5cbiAgICBsZXQgaGFzaEluZm8gPSBhd2FpdCB0aGlzLmZpbGVDaGFuZ2VDYWNoZS5nZXRIYXNoRm9yUGF0aChmaWxlUGF0aCk7XG5cbiAgICAvLyBOQjogSGVyZSwgd2UncmUgYmFzaWNhbGx5IG9ubHkgdXNpbmcgdGhlIGNvbXBpbGVyIGhlcmUgdG8gZmluZFxuICAgIC8vIHRoZSBhcHByb3ByaWF0ZSBDb21waWxlQ2FjaGVcbiAgICBsZXQgY29tcGlsZXIgPSBDb21waWxlckhvc3Quc2hvdWxkUGFzc3Rocm91Z2goaGFzaEluZm8pID9cbiAgICAgIHRoaXMuZ2V0UGFzc3Rocm91Z2hDb21waWxlcigpIDpcbiAgICAgIHRoaXMuY29tcGlsZXJzQnlNaW1lVHlwZVt0eXBlIHx8ICdfX2xvbG5vdGhlcmUnXTtcblxuXG4gICAgLy8gTkI6IFdlIGRvbid0IHB1dCB0aGlzIGludG8gc2hvdWxkUGFzc3Rocm91Z2ggYmVjYXVzZSBJbmxpbmUgSFRNTFxuICAgIC8vIGNvbXBpbGVyIGlzIHRlY2huaWNhbGx5IG9mIHR5cGUgZmluYWxGb3JtcyAoaS5lLiBhIGJyb3dzZXIgY2FuXG4gICAgLy8gbmF0aXZlbHkgaGFuZGxlIHRoaXMgY29udGVudCksIHlldCBpdHMgY29tcGlsZXIgaXNcbiAgICAvLyBJbmxpbmVIdG1sQ29tcGlsZXIuIEhvd2V2ZXIsIHdlIHN0aWxsIHdhbnQgdG8gY2F0Y2ggc3RhbmRhcmQgQ1NTIGZpbGVzXG4gICAgLy8gd2hpY2ggd2lsbCBiZSBwcm9jZXNzZWQgYnkgUGFzc3Rocm91Z2hDb21waWxlci5cbiAgICBpZiAoZmluYWxGb3Jtc1t0eXBlXSAmJiAhY29tcGlsZXIpIHtcbiAgICAgIGNvbXBpbGVyID0gdGhpcy5nZXRQYXNzdGhyb3VnaENvbXBpbGVyKCk7XG4gICAgfVxuXG4gICAgaWYgKCFjb21waWxlcikge1xuICAgICAgY29tcGlsZXIgPSB0aGlzLmZhbGxiYWNrQ29tcGlsZXI7XG5cbiAgICAgIGxldCB7IGNvZGUsIGJpbmFyeURhdGEsIG1pbWVUeXBlIH0gPSBhd2FpdCBjb21waWxlci5nZXQoZmlsZVBhdGgpO1xuICAgICAgcmV0dXJuIHsgY29kZTogY29kZSB8fCBiaW5hcnlEYXRhLCBtaW1lVHlwZSB9O1xuICAgIH1cblxuICAgIGxldCBjYWNoZSA9IHRoaXMuY2FjaGVzRm9yQ29tcGlsZXJzLmdldChjb21waWxlcik7XG4gICAgbGV0IHtjb2RlLCBiaW5hcnlEYXRhLCBtaW1lVHlwZX0gPSBhd2FpdCBjYWNoZS5nZXQoZmlsZVBhdGgpO1xuXG4gICAgY29kZSA9IGNvZGUgfHwgYmluYXJ5RGF0YTtcbiAgICBpZiAoIWNvZGUgfHwgIW1pbWVUeXBlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEFza2VkIHRvIGNvbXBpbGUgJHtmaWxlUGF0aH0gaW4gcHJvZHVjdGlvbiwgaXMgdGhpcyBmaWxlIG5vdCBwcmVjb21waWxlZD9gKTtcbiAgICB9XG5cbiAgICByZXR1cm4geyBjb2RlLCBtaW1lVHlwZSB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZXMgY29tcGlsYXRpb24gaW4gcmVhZC13cml0ZSBtb2RlXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBhc3luYyBmdWxsQ29tcGlsZShmaWxlUGF0aCkge1xuICAgIGQoYENvbXBpbGluZyAke2ZpbGVQYXRofWApO1xuICAgIGxldCB0eXBlID0gbWltZVR5cGVzLmxvb2t1cChmaWxlUGF0aCk7XG5cbiAgICBzZW5kKCdlbGVjdHJvbi1jb21waWxlLWNvbXBpbGVkLWZpbGUnLCB7IGZpbGVQYXRoLCBtaW1lVHlwZTogdHlwZSB9KTtcblxuICAgIGxldCBoYXNoSW5mbyA9IGF3YWl0IHRoaXMuZmlsZUNoYW5nZUNhY2hlLmdldEhhc2hGb3JQYXRoKGZpbGVQYXRoKTtcblxuICAgIGlmIChoYXNoSW5mby5pc0luTm9kZU1vZHVsZXMpIHtcbiAgICAgIGxldCBjb2RlID0gaGFzaEluZm8uc291cmNlQ29kZSB8fCBhd2FpdCBwZnMucmVhZEZpbGUoZmlsZVBhdGgsICd1dGY4Jyk7XG4gICAgICBjb2RlID0gYXdhaXQgQ29tcGlsZXJIb3N0LmZpeE5vZGVNb2R1bGVzU291cmNlTWFwcGluZyhjb2RlLCBmaWxlUGF0aCwgdGhpcy5maWxlQ2hhbmdlQ2FjaGUuYXBwUm9vdCk7XG4gICAgICByZXR1cm4geyBjb2RlLCBtaW1lVHlwZTogdHlwZSB9O1xuICAgIH1cblxuICAgIGxldCBjb21waWxlciA9IENvbXBpbGVySG9zdC5zaG91bGRQYXNzdGhyb3VnaChoYXNoSW5mbykgP1xuICAgICAgdGhpcy5nZXRQYXNzdGhyb3VnaENvbXBpbGVyKCkgOlxuICAgICAgdGhpcy5jb21waWxlcnNCeU1pbWVUeXBlW3R5cGUgfHwgJ19fbG9sbm90aGVyZSddO1xuXG4gICAgaWYgKCFjb21waWxlcikge1xuICAgICAgZChgRmFsbGluZyBiYWNrIHRvIHBhc3N0aHJvdWdoIGNvbXBpbGVyIGZvciAke2ZpbGVQYXRofWApO1xuICAgICAgY29tcGlsZXIgPSB0aGlzLmZhbGxiYWNrQ29tcGlsZXI7XG4gICAgfVxuXG4gICAgaWYgKCFjb21waWxlcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZG4ndCBmaW5kIGEgY29tcGlsZXIgZm9yICR7ZmlsZVBhdGh9YCk7XG4gICAgfVxuXG4gICAgbGV0IGNhY2hlID0gdGhpcy5jYWNoZXNGb3JDb21waWxlcnMuZ2V0KGNvbXBpbGVyKTtcbiAgICByZXR1cm4gYXdhaXQgY2FjaGUuZ2V0T3JGZXRjaChcbiAgICAgIGZpbGVQYXRoLFxuICAgICAgKGZpbGVQYXRoLCBoYXNoSW5mbykgPT4gdGhpcy5jb21waWxlVW5jYWNoZWQoZmlsZVBhdGgsIGhhc2hJbmZvLCBjb21waWxlcikpO1xuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZXMgaW52b2tpbmcgY29tcGlsZXJzIGluZGVwZW5kZW50IG9mIGNhY2hpbmdcbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGFzeW5jIGNvbXBpbGVVbmNhY2hlZChmaWxlUGF0aCwgaGFzaEluZm8sIGNvbXBpbGVyKSB7XG4gICAgbGV0IGlucHV0TWltZVR5cGUgPSBtaW1lVHlwZXMubG9va3VwKGZpbGVQYXRoKTtcblxuICAgIGlmIChoYXNoSW5mby5pc0ZpbGVCaW5hcnkpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGJpbmFyeURhdGE6IGhhc2hJbmZvLmJpbmFyeURhdGEgfHwgYXdhaXQgcGZzLnJlYWRGaWxlKGZpbGVQYXRoKSxcbiAgICAgICAgbWltZVR5cGU6IGlucHV0TWltZVR5cGUsXG4gICAgICAgIGRlcGVuZGVudEZpbGVzOiBbXVxuICAgICAgfTtcbiAgICB9XG5cbiAgICBsZXQgY3R4ID0ge307XG4gICAgbGV0IGNvZGUgPSBoYXNoSW5mby5zb3VyY2VDb2RlIHx8IGF3YWl0IHBmcy5yZWFkRmlsZShmaWxlUGF0aCwgJ3V0ZjgnKTtcblxuICAgIGlmICghKGF3YWl0IGNvbXBpbGVyLnNob3VsZENvbXBpbGVGaWxlKGNvZGUsIGN0eCkpKSB7XG4gICAgICBkKGBDb21waWxlciByZXR1cm5lZCBmYWxzZSBmb3Igc2hvdWxkQ29tcGlsZUZpbGU6ICR7ZmlsZVBhdGh9YCk7XG4gICAgICByZXR1cm4geyBjb2RlLCBtaW1lVHlwZTogbWltZVR5cGVzLmxvb2t1cChmaWxlUGF0aCksIGRlcGVuZGVudEZpbGVzOiBbXSB9O1xuICAgIH1cblxuICAgIGxldCBkZXBlbmRlbnRGaWxlcyA9IGF3YWl0IGNvbXBpbGVyLmRldGVybWluZURlcGVuZGVudEZpbGVzKGNvZGUsIGZpbGVQYXRoLCBjdHgpO1xuXG4gICAgZChgVXNpbmcgY29tcGlsZXIgb3B0aW9uczogJHtKU09OLnN0cmluZ2lmeShjb21waWxlci5jb21waWxlck9wdGlvbnMpfWApO1xuICAgIGxldCByZXN1bHQgPSBhd2FpdCBjb21waWxlci5jb21waWxlKGNvZGUsIGZpbGVQYXRoLCBjdHgpO1xuXG4gICAgbGV0IHNob3VsZElubGluZUh0bWxpZnkgPVxuICAgICAgaW5wdXRNaW1lVHlwZSAhPT0gJ3RleHQvaHRtbCcgJiZcbiAgICAgIHJlc3VsdC5taW1lVHlwZSA9PT0gJ3RleHQvaHRtbCc7XG5cbiAgICBsZXQgaXNQYXNzdGhyb3VnaCA9XG4gICAgICByZXN1bHQubWltZVR5cGUgPT09ICd0ZXh0L3BsYWluJyB8fFxuICAgICAgIXJlc3VsdC5taW1lVHlwZSB8fFxuICAgICAgQ29tcGlsZXJIb3N0LnNob3VsZFBhc3N0aHJvdWdoKGhhc2hJbmZvKTtcblxuICAgIGlmICgoZmluYWxGb3Jtc1tyZXN1bHQubWltZVR5cGVdICYmICFzaG91bGRJbmxpbmVIdG1saWZ5KSB8fCBpc1Bhc3N0aHJvdWdoKSB7XG4gICAgICAvLyBHb3Qgc29tZXRoaW5nIHdlIGNhbiB1c2UgaW4tYnJvd3NlciwgbGV0J3MgcmV0dXJuIGl0XG4gICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihyZXN1bHQsIHtkZXBlbmRlbnRGaWxlc30pO1xuICAgIH0gZWxzZSB7XG4gICAgICBkKGBSZWN1cnNpdmVseSBjb21waWxpbmcgcmVzdWx0IG9mICR7ZmlsZVBhdGh9IHdpdGggbm9uLWZpbmFsIE1JTUUgdHlwZSAke3Jlc3VsdC5taW1lVHlwZX0sIGlucHV0IHdhcyAke2lucHV0TWltZVR5cGV9YCk7XG5cbiAgICAgIGhhc2hJbmZvID0gT2JqZWN0LmFzc2lnbih7IHNvdXJjZUNvZGU6IHJlc3VsdC5jb2RlLCBtaW1lVHlwZTogcmVzdWx0Lm1pbWVUeXBlIH0sIGhhc2hJbmZvKTtcbiAgICAgIGNvbXBpbGVyID0gdGhpcy5jb21waWxlcnNCeU1pbWVUeXBlW3Jlc3VsdC5taW1lVHlwZSB8fCAnX19sb2xub3RoZXJlJ107XG5cbiAgICAgIGlmICghY29tcGlsZXIpIHtcbiAgICAgICAgZChgUmVjdXJzaXZlIGNvbXBpbGUgZmFpbGVkIC0gaW50ZXJtZWRpYXRlIHJlc3VsdDogJHtKU09OLnN0cmluZ2lmeShyZXN1bHQpfWApO1xuXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQ29tcGlsaW5nICR7ZmlsZVBhdGh9IHJlc3VsdGVkIGluIGEgTUlNRSB0eXBlIG9mICR7cmVzdWx0Lm1pbWVUeXBlfSwgd2hpY2ggd2UgZG9uJ3Qga25vdyBob3cgdG8gaGFuZGxlYCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNvbXBpbGVVbmNhY2hlZChcbiAgICAgICAgYCR7ZmlsZVBhdGh9LiR7bWltZVR5cGVzLmV4dGVuc2lvbihyZXN1bHQubWltZVR5cGUgfHwgJ3R4dCcpfWAsXG4gICAgICAgIGhhc2hJbmZvLCBjb21waWxlcik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFByZS1jYWNoZXMgYW4gZW50aXJlIGRpcmVjdG9yeSBvZiBmaWxlcyByZWN1cnNpdmVseS4gVXN1YWxseSB1c2VkIGZvclxuICAgKiBidWlsZGluZyBjdXN0b20gY29tcGlsZXIgdG9vbGluZy5cbiAgICpcbiAgICogQHBhcmFtICB7c3RyaW5nfSByb290RGlyZWN0b3J5ICBUaGUgdG9wLWxldmVsIGRpcmVjdG9yeSB0byBjb21waWxlXG4gICAqXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBzaG91bGRDb21waWxlIChvcHRpb25hbCkgIEEgRnVuY3Rpb24gd2hpY2ggYWxsb3dzIHRoZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsZXIgdG8gZGlzYWJsZSBjb21waWxpbmcgY2VydGFpbiBmaWxlcy5cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSXQgdGFrZXMgYSBmdWxseS1xdWFsaWZpZWQgcGF0aCB0byBhIGZpbGUsXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFuZCBzaG91bGQgcmV0dXJuIGEgQm9vbGVhbi5cbiAgICpcbiAgICogQHJldHVybiB7UHJvbWlzZX0gIENvbXBsZXRpb24uXG4gICAqL1xuICBhc3luYyBjb21waWxlQWxsKHJvb3REaXJlY3RvcnksIHNob3VsZENvbXBpbGU9bnVsbCkge1xuICAgIGxldCBzaG91bGQgPSBzaG91bGRDb21waWxlIHx8IGZ1bmN0aW9uKCkge3JldHVybiB0cnVlO307XG5cbiAgICBhd2FpdCBmb3JBbGxGaWxlcyhyb290RGlyZWN0b3J5LCAoZikgPT4ge1xuICAgICAgaWYgKCFzaG91bGQoZikpIHJldHVybjtcblxuICAgICAgZChgQ29tcGlsaW5nICR7Zn1gKTtcbiAgICAgIHJldHVybiB0aGlzLmNvbXBpbGUoZiwgdGhpcy5jb21waWxlcnNCeU1pbWVUeXBlKTtcbiAgICB9KTtcbiAgfVxuXG4gIGxpc3RlblRvQ29tcGlsZUV2ZW50cygpIHtcbiAgICByZXR1cm4gbGlzdGVuKCdlbGVjdHJvbi1jb21waWxlLWNvbXBpbGVkLWZpbGUnKS5tYXAoKFt4XSkgPT4geCk7XG4gIH1cblxuICAvKlxuICAgKiBTeW5jIE1ldGhvZHNcbiAgICovXG5cbiAgY29tcGlsZVN5bmMoZmlsZVBhdGgpIHtcbiAgICBsZXQgcmV0ID0gKHRoaXMucmVhZE9ubHlNb2RlID9cbiAgICAgIHRoaXMuY29tcGlsZVJlYWRPbmx5U3luYyhmaWxlUGF0aCkgOlxuICAgICAgdGhpcy5mdWxsQ29tcGlsZVN5bmMoZmlsZVBhdGgpKTtcblxuICAgIGlmIChyZXQubWltZVR5cGUgPT09ICdhcHBsaWNhdGlvbi9qYXZhc2NyaXB0Jykge1xuICAgICAgdGhpcy5taW1lVHlwZXNUb1JlZ2lzdGVyW21pbWVUeXBlcy5sb29rdXAoZmlsZVBhdGgpXSA9IHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIHN0YXRpYyBjcmVhdGVSZWFkb25seUZyb21Db25maWd1cmF0aW9uU3luYyhyb290Q2FjaGVEaXIsIGFwcFJvb3QsIGZhbGxiYWNrQ29tcGlsZXI9bnVsbCkge1xuICAgIGxldCB0YXJnZXQgPSBwYXRoLmpvaW4ocm9vdENhY2hlRGlyLCAnY29tcGlsZXItaW5mby5qc29uLmd6Jyk7XG4gICAgbGV0IGJ1ZiA9IGZzLnJlYWRGaWxlU3luYyh0YXJnZXQpO1xuICAgIGxldCBpbmZvID0gSlNPTi5wYXJzZSh6bGliLmd1bnppcFN5bmMoYnVmKSk7XG5cbiAgICBsZXQgZmlsZUNoYW5nZUNhY2hlID0gRmlsZUNoYW5nZWRDYWNoZS5sb2FkRnJvbURhdGEoaW5mby5maWxlQ2hhbmdlQ2FjaGUsIGFwcFJvb3QsIHRydWUpO1xuXG4gICAgbGV0IGNvbXBpbGVycyA9IE9iamVjdC5rZXlzKGluZm8uY29tcGlsZXJzKS5yZWR1Y2UoKGFjYywgeCkgPT4ge1xuICAgICAgbGV0IGN1ciA9IGluZm8uY29tcGlsZXJzW3hdO1xuICAgICAgYWNjW3hdID0gbmV3IFJlYWRPbmx5Q29tcGlsZXIoY3VyLm5hbWUsIGN1ci5jb21waWxlclZlcnNpb24sIGN1ci5jb21waWxlck9wdGlvbnMsIGN1ci5pbnB1dE1pbWVUeXBlcyk7XG5cbiAgICAgIHJldHVybiBhY2M7XG4gICAgfSwge30pO1xuXG4gICAgcmV0dXJuIG5ldyBDb21waWxlckhvc3Qocm9vdENhY2hlRGlyLCBjb21waWxlcnMsIGZpbGVDaGFuZ2VDYWNoZSwgdHJ1ZSwgZmFsbGJhY2tDb21waWxlciwgbnVsbCwgaW5mby5taW1lVHlwZXNUb1JlZ2lzdGVyKTtcbiAgfVxuXG4gIHN0YXRpYyBjcmVhdGVGcm9tQ29uZmlndXJhdGlvblN5bmMocm9vdENhY2hlRGlyLCBhcHBSb290LCBjb21waWxlcnNCeU1pbWVUeXBlLCBmYWxsYmFja0NvbXBpbGVyPW51bGwpIHtcbiAgICBsZXQgdGFyZ2V0ID0gcGF0aC5qb2luKHJvb3RDYWNoZURpciwgJ2NvbXBpbGVyLWluZm8uanNvbi5neicpO1xuICAgIGxldCBidWYgPSBmcy5yZWFkRmlsZVN5bmModGFyZ2V0KTtcbiAgICBsZXQgaW5mbyA9IEpTT04ucGFyc2UoemxpYi5ndW56aXBTeW5jKGJ1ZikpO1xuXG4gICAgbGV0IGZpbGVDaGFuZ2VDYWNoZSA9IEZpbGVDaGFuZ2VkQ2FjaGUubG9hZEZyb21EYXRhKGluZm8uZmlsZUNoYW5nZUNhY2hlLCBhcHBSb290LCBmYWxzZSk7XG5cbiAgICBPYmplY3Qua2V5cyhpbmZvLmNvbXBpbGVycykuZm9yRWFjaCgoeCkgPT4ge1xuICAgICAgbGV0IGN1ciA9IGluZm8uY29tcGlsZXJzW3hdO1xuICAgICAgY29tcGlsZXJzQnlNaW1lVHlwZVt4XS5jb21waWxlck9wdGlvbnMgPSBjdXIuY29tcGlsZXJPcHRpb25zO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5ldyBDb21waWxlckhvc3Qocm9vdENhY2hlRGlyLCBjb21waWxlcnNCeU1pbWVUeXBlLCBmaWxlQ2hhbmdlQ2FjaGUsIGZhbHNlLCBmYWxsYmFja0NvbXBpbGVyLCBudWxsLCBpbmZvLm1pbWVUeXBlc1RvUmVnaXN0ZXIpO1xuICB9XG5cbiAgc2F2ZUNvbmZpZ3VyYXRpb25TeW5jKCkge1xuICAgIGxldCBzZXJpYWxpemVkQ29tcGlsZXJPcHRzID0gT2JqZWN0LmtleXModGhpcy5jb21waWxlcnNCeU1pbWVUeXBlKS5yZWR1Y2UoKGFjYywgeCkgPT4ge1xuICAgICAgbGV0IGNvbXBpbGVyID0gdGhpcy5jb21waWxlcnNCeU1pbWVUeXBlW3hdO1xuICAgICAgbGV0IEtsYXNzID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKGNvbXBpbGVyKS5jb25zdHJ1Y3RvcjtcblxuICAgICAgbGV0IHZhbCA9IHtcbiAgICAgICAgbmFtZTogS2xhc3MubmFtZSxcbiAgICAgICAgaW5wdXRNaW1lVHlwZXM6IEtsYXNzLmdldElucHV0TWltZVR5cGVzKCksXG4gICAgICAgIGNvbXBpbGVyT3B0aW9uczogY29tcGlsZXIuY29tcGlsZXJPcHRpb25zLFxuICAgICAgICBjb21waWxlclZlcnNpb246IGNvbXBpbGVyLmdldENvbXBpbGVyVmVyc2lvbigpXG4gICAgICB9O1xuXG4gICAgICBhY2NbeF0gPSB2YWw7XG4gICAgICByZXR1cm4gYWNjO1xuICAgIH0sIHt9KTtcblxuICAgIGxldCBpbmZvID0ge1xuICAgICAgZmlsZUNoYW5nZUNhY2hlOiB0aGlzLmZpbGVDaGFuZ2VDYWNoZS5nZXRTYXZlZERhdGEoKSxcbiAgICAgIGNvbXBpbGVyczogc2VyaWFsaXplZENvbXBpbGVyT3B0cyxcbiAgICAgIG1pbWVUeXBlc1RvUmVnaXN0ZXI6IHRoaXMubWltZVR5cGVzVG9SZWdpc3RlclxuICAgIH07XG5cbiAgICBsZXQgdGFyZ2V0ID0gcGF0aC5qb2luKHRoaXMucm9vdENhY2hlRGlyLCAnY29tcGlsZXItaW5mby5qc29uLmd6Jyk7XG4gICAgbGV0IGJ1ZiA9IHpsaWIuZ3ppcFN5bmMobmV3IEJ1ZmZlcihKU09OLnN0cmluZ2lmeShpbmZvKSkpO1xuICAgIGZzLndyaXRlRmlsZVN5bmModGFyZ2V0LCBidWYpO1xuICB9XG5cbiAgY29tcGlsZVJlYWRPbmx5U3luYyhmaWxlUGF0aCkge1xuICAgIC8vIFdlIGd1YXJhbnRlZSB0aGF0IG5vZGVfbW9kdWxlcyBhcmUgYWx3YXlzIHNoaXBwZWQgZGlyZWN0bHlcbiAgICBsZXQgdHlwZSA9IG1pbWVUeXBlcy5sb29rdXAoZmlsZVBhdGgpO1xuICAgIGlmIChGaWxlQ2hhbmdlZENhY2hlLmlzSW5Ob2RlTW9kdWxlcyhmaWxlUGF0aCkpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG1pbWVUeXBlOiB0eXBlIHx8ICdhcHBsaWNhdGlvbi9qYXZhc2NyaXB0JyxcbiAgICAgICAgY29kZTogZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmOCcpXG4gICAgICB9O1xuICAgIH1cblxuICAgIGxldCBoYXNoSW5mbyA9IHRoaXMuZmlsZUNoYW5nZUNhY2hlLmdldEhhc2hGb3JQYXRoU3luYyhmaWxlUGF0aCk7XG5cbiAgICAvLyBXZSBndWFyYW50ZWUgdGhhdCBub2RlX21vZHVsZXMgYXJlIGFsd2F5cyBzaGlwcGVkIGRpcmVjdGx5XG4gICAgaWYgKGhhc2hJbmZvLmlzSW5Ob2RlTW9kdWxlcykge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbWltZVR5cGU6IHR5cGUsXG4gICAgICAgIGNvZGU6IGhhc2hJbmZvLnNvdXJjZUNvZGUgfHwgZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmOCcpXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIE5COiBIZXJlLCB3ZSdyZSBiYXNpY2FsbHkgb25seSB1c2luZyB0aGUgY29tcGlsZXIgaGVyZSB0byBmaW5kXG4gICAgLy8gdGhlIGFwcHJvcHJpYXRlIENvbXBpbGVDYWNoZVxuICAgIGxldCBjb21waWxlciA9IENvbXBpbGVySG9zdC5zaG91bGRQYXNzdGhyb3VnaChoYXNoSW5mbykgP1xuICAgICAgdGhpcy5nZXRQYXNzdGhyb3VnaENvbXBpbGVyKCkgOlxuICAgICAgdGhpcy5jb21waWxlcnNCeU1pbWVUeXBlW3R5cGUgfHwgJ19fbG9sbm90aGVyZSddO1xuXG4gICAgLy8gTkI6IFdlIGRvbid0IHB1dCB0aGlzIGludG8gc2hvdWxkUGFzc3Rocm91Z2ggYmVjYXVzZSBJbmxpbmUgSFRNTFxuICAgIC8vIGNvbXBpbGVyIGlzIHRlY2huaWNhbGx5IG9mIHR5cGUgZmluYWxGb3JtcyAoaS5lLiBhIGJyb3dzZXIgY2FuXG4gICAgLy8gbmF0aXZlbHkgaGFuZGxlIHRoaXMgY29udGVudCksIHlldCBpdHMgY29tcGlsZXIgaXNcbiAgICAvLyBJbmxpbmVIdG1sQ29tcGlsZXIuIEhvd2V2ZXIsIHdlIHN0aWxsIHdhbnQgdG8gY2F0Y2ggc3RhbmRhcmQgQ1NTIGZpbGVzXG4gICAgLy8gd2hpY2ggd2lsbCBiZSBwcm9jZXNzZWQgYnkgUGFzc3Rocm91Z2hDb21waWxlci5cbiAgICBpZiAoZmluYWxGb3Jtc1t0eXBlXSAmJiAhY29tcGlsZXIpIHtcbiAgICAgIGNvbXBpbGVyID0gdGhpcy5nZXRQYXNzdGhyb3VnaENvbXBpbGVyKCk7XG4gICAgfVxuXG4gICAgaWYgKCFjb21waWxlcikge1xuICAgICAgY29tcGlsZXIgPSB0aGlzLmZhbGxiYWNrQ29tcGlsZXI7XG5cbiAgICAgIGxldCB7IGNvZGUsIGJpbmFyeURhdGEsIG1pbWVUeXBlIH0gPSBjb21waWxlci5nZXRTeW5jKGZpbGVQYXRoKTtcbiAgICAgIHJldHVybiB7IGNvZGU6IGNvZGUgfHwgYmluYXJ5RGF0YSwgbWltZVR5cGUgfTtcbiAgICB9XG5cbiAgICBsZXQgY2FjaGUgPSB0aGlzLmNhY2hlc0ZvckNvbXBpbGVycy5nZXQoY29tcGlsZXIpO1xuICAgIGxldCB7Y29kZSwgYmluYXJ5RGF0YSwgbWltZVR5cGV9ID0gY2FjaGUuZ2V0U3luYyhmaWxlUGF0aCk7XG5cbiAgICBjb2RlID0gY29kZSB8fCBiaW5hcnlEYXRhO1xuICAgIGlmICghY29kZSB8fCAhbWltZVR5cGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQXNrZWQgdG8gY29tcGlsZSAke2ZpbGVQYXRofSBpbiBwcm9kdWN0aW9uLCBpcyB0aGlzIGZpbGUgbm90IHByZWNvbXBpbGVkP2ApO1xuICAgIH1cblxuICAgIHJldHVybiB7IGNvZGUsIG1pbWVUeXBlIH07XG4gIH1cblxuICBmdWxsQ29tcGlsZVN5bmMoZmlsZVBhdGgpIHtcbiAgICBkKGBDb21waWxpbmcgJHtmaWxlUGF0aH1gKTtcblxuICAgIGxldCB0eXBlID0gbWltZVR5cGVzLmxvb2t1cChmaWxlUGF0aCk7XG5cbiAgICBzZW5kKCdlbGVjdHJvbi1jb21waWxlLWNvbXBpbGVkLWZpbGUnLCB7IGZpbGVQYXRoLCBtaW1lVHlwZTogdHlwZSB9KTtcblxuICAgIGxldCBoYXNoSW5mbyA9IHRoaXMuZmlsZUNoYW5nZUNhY2hlLmdldEhhc2hGb3JQYXRoU3luYyhmaWxlUGF0aCk7XG5cbiAgICBpZiAoaGFzaEluZm8uaXNJbk5vZGVNb2R1bGVzKSB7XG4gICAgICBsZXQgY29kZSA9IGhhc2hJbmZvLnNvdXJjZUNvZGUgfHwgZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmOCcpO1xuICAgICAgY29kZSA9IENvbXBpbGVySG9zdC5maXhOb2RlTW9kdWxlc1NvdXJjZU1hcHBpbmdTeW5jKGNvZGUsIGZpbGVQYXRoLCB0aGlzLmZpbGVDaGFuZ2VDYWNoZS5hcHBSb290KTtcbiAgICAgIHJldHVybiB7IGNvZGUsIG1pbWVUeXBlOiB0eXBlIH07XG4gICAgfVxuXG4gICAgbGV0IGNvbXBpbGVyID0gQ29tcGlsZXJIb3N0LnNob3VsZFBhc3N0aHJvdWdoKGhhc2hJbmZvKSA/XG4gICAgICB0aGlzLmdldFBhc3N0aHJvdWdoQ29tcGlsZXIoKSA6XG4gICAgICB0aGlzLmNvbXBpbGVyc0J5TWltZVR5cGVbdHlwZSB8fCAnX19sb2xub3RoZXJlJ107XG5cbiAgICBpZiAoIWNvbXBpbGVyKSB7XG4gICAgICBkKGBGYWxsaW5nIGJhY2sgdG8gcGFzc3Rocm91Z2ggY29tcGlsZXIgZm9yICR7ZmlsZVBhdGh9YCk7XG4gICAgICBjb21waWxlciA9IHRoaXMuZmFsbGJhY2tDb21waWxlcjtcbiAgICB9XG5cbiAgICBpZiAoIWNvbXBpbGVyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkbid0IGZpbmQgYSBjb21waWxlciBmb3IgJHtmaWxlUGF0aH1gKTtcbiAgICB9XG5cbiAgICBsZXQgY2FjaGUgPSB0aGlzLmNhY2hlc0ZvckNvbXBpbGVycy5nZXQoY29tcGlsZXIpO1xuICAgIHJldHVybiBjYWNoZS5nZXRPckZldGNoU3luYyhcbiAgICAgIGZpbGVQYXRoLFxuICAgICAgKGZpbGVQYXRoLCBoYXNoSW5mbykgPT4gdGhpcy5jb21waWxlVW5jYWNoZWRTeW5jKGZpbGVQYXRoLCBoYXNoSW5mbywgY29tcGlsZXIpKTtcbiAgfVxuXG4gIGNvbXBpbGVVbmNhY2hlZFN5bmMoZmlsZVBhdGgsIGhhc2hJbmZvLCBjb21waWxlcikge1xuICAgIGxldCBpbnB1dE1pbWVUeXBlID0gbWltZVR5cGVzLmxvb2t1cChmaWxlUGF0aCk7XG5cbiAgICBpZiAoaGFzaEluZm8uaXNGaWxlQmluYXJ5KSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBiaW5hcnlEYXRhOiBoYXNoSW5mby5iaW5hcnlEYXRhIHx8IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCksXG4gICAgICAgIG1pbWVUeXBlOiBpbnB1dE1pbWVUeXBlLFxuICAgICAgICBkZXBlbmRlbnRGaWxlczogW11cbiAgICAgIH07XG4gICAgfVxuXG4gICAgbGV0IGN0eCA9IHt9O1xuICAgIGxldCBjb2RlID0gaGFzaEluZm8uc291cmNlQ29kZSB8fCBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4Jyk7XG5cbiAgICBpZiAoIShjb21waWxlci5zaG91bGRDb21waWxlRmlsZVN5bmMoY29kZSwgY3R4KSkpIHtcbiAgICAgIGQoYENvbXBpbGVyIHJldHVybmVkIGZhbHNlIGZvciBzaG91bGRDb21waWxlRmlsZTogJHtmaWxlUGF0aH1gKTtcbiAgICAgIHJldHVybiB7IGNvZGUsIG1pbWVUeXBlOiBtaW1lVHlwZXMubG9va3VwKGZpbGVQYXRoKSwgZGVwZW5kZW50RmlsZXM6IFtdIH07XG4gICAgfVxuXG4gICAgbGV0IGRlcGVuZGVudEZpbGVzID0gY29tcGlsZXIuZGV0ZXJtaW5lRGVwZW5kZW50RmlsZXNTeW5jKGNvZGUsIGZpbGVQYXRoLCBjdHgpO1xuXG4gICAgbGV0IHJlc3VsdCA9IGNvbXBpbGVyLmNvbXBpbGVTeW5jKGNvZGUsIGZpbGVQYXRoLCBjdHgpO1xuXG4gICAgbGV0IHNob3VsZElubGluZUh0bWxpZnkgPVxuICAgICAgaW5wdXRNaW1lVHlwZSAhPT0gJ3RleHQvaHRtbCcgJiZcbiAgICAgIHJlc3VsdC5taW1lVHlwZSA9PT0gJ3RleHQvaHRtbCc7XG5cbiAgICBsZXQgaXNQYXNzdGhyb3VnaCA9XG4gICAgICByZXN1bHQubWltZVR5cGUgPT09ICd0ZXh0L3BsYWluJyB8fFxuICAgICAgIXJlc3VsdC5taW1lVHlwZSB8fFxuICAgICAgQ29tcGlsZXJIb3N0LnNob3VsZFBhc3N0aHJvdWdoKGhhc2hJbmZvKTtcblxuICAgIGlmICgoZmluYWxGb3Jtc1tyZXN1bHQubWltZVR5cGVdICYmICFzaG91bGRJbmxpbmVIdG1saWZ5KSB8fCBpc1Bhc3N0aHJvdWdoKSB7XG4gICAgICAvLyBHb3Qgc29tZXRoaW5nIHdlIGNhbiB1c2UgaW4tYnJvd3NlciwgbGV0J3MgcmV0dXJuIGl0XG4gICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihyZXN1bHQsIHtkZXBlbmRlbnRGaWxlc30pO1xuICAgIH0gZWxzZSB7XG4gICAgICBkKGBSZWN1cnNpdmVseSBjb21waWxpbmcgcmVzdWx0IG9mICR7ZmlsZVBhdGh9IHdpdGggbm9uLWZpbmFsIE1JTUUgdHlwZSAke3Jlc3VsdC5taW1lVHlwZX0sIGlucHV0IHdhcyAke2lucHV0TWltZVR5cGV9YCk7XG5cbiAgICAgIGhhc2hJbmZvID0gT2JqZWN0LmFzc2lnbih7IHNvdXJjZUNvZGU6IHJlc3VsdC5jb2RlLCBtaW1lVHlwZTogcmVzdWx0Lm1pbWVUeXBlIH0sIGhhc2hJbmZvKTtcbiAgICAgIGNvbXBpbGVyID0gdGhpcy5jb21waWxlcnNCeU1pbWVUeXBlW3Jlc3VsdC5taW1lVHlwZSB8fCAnX19sb2xub3RoZXJlJ107XG5cbiAgICAgIGlmICghY29tcGlsZXIpIHtcbiAgICAgICAgZChgUmVjdXJzaXZlIGNvbXBpbGUgZmFpbGVkIC0gaW50ZXJtZWRpYXRlIHJlc3VsdDogJHtKU09OLnN0cmluZ2lmeShyZXN1bHQpfWApO1xuXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQ29tcGlsaW5nICR7ZmlsZVBhdGh9IHJlc3VsdGVkIGluIGEgTUlNRSB0eXBlIG9mICR7cmVzdWx0Lm1pbWVUeXBlfSwgd2hpY2ggd2UgZG9uJ3Qga25vdyBob3cgdG8gaGFuZGxlYCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLmNvbXBpbGVVbmNhY2hlZFN5bmMoXG4gICAgICAgIGAke2ZpbGVQYXRofS4ke21pbWVUeXBlcy5leHRlbnNpb24ocmVzdWx0Lm1pbWVUeXBlIHx8ICd0eHQnKX1gLFxuICAgICAgICBoYXNoSW5mbywgY29tcGlsZXIpO1xuICAgIH1cbiAgfVxuXG4gIGNvbXBpbGVBbGxTeW5jKHJvb3REaXJlY3RvcnksIHNob3VsZENvbXBpbGU9bnVsbCkge1xuICAgIGxldCBzaG91bGQgPSBzaG91bGRDb21waWxlIHx8IGZ1bmN0aW9uKCkge3JldHVybiB0cnVlO307XG5cbiAgICBmb3JBbGxGaWxlc1N5bmMocm9vdERpcmVjdG9yeSwgKGYpID0+IHtcbiAgICAgIGlmICghc2hvdWxkKGYpKSByZXR1cm47XG4gICAgICByZXR1cm4gdGhpcy5jb21waWxlU3luYyhmLCB0aGlzLmNvbXBpbGVyc0J5TWltZVR5cGUpO1xuICAgIH0pO1xuICB9XG5cbiAgLypcbiAgICogT3RoZXIgc3R1ZmZcbiAgICovXG5cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgcGFzc3Rocm91Z2ggY29tcGlsZXJcbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGdldFBhc3N0aHJvdWdoQ29tcGlsZXIoKSB7XG4gICAgcmV0dXJuIHRoaXMuY29tcGlsZXJzQnlNaW1lVHlwZVsndGV4dC9wbGFpbiddO1xuICB9XG5cblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyB3aGV0aGVyIHdlIHNob3VsZCBldmVuIHRyeSB0byBjb21waWxlIHRoZSBjb250ZW50LiBOb3RlIHRoYXQgaW5cbiAgICogc29tZSBjYXNlcywgY29udGVudCB3aWxsIHN0aWxsIGJlIGluIGNhY2hlIGV2ZW4gaWYgdGhpcyByZXR1cm5zIHRydWUsIGFuZFxuICAgKiBpbiBvdGhlciBjYXNlcyAoaXNJbk5vZGVNb2R1bGVzKSwgd2UnbGwga25vdyBleHBsaWNpdGx5IHRvIG5vdCBldmVuIGJvdGhlclxuICAgKiBsb29raW5nIGluIHRoZSBjYWNoZS5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG4gIHN0YXRpYyBzaG91bGRQYXNzdGhyb3VnaChoYXNoSW5mbykge1xuICAgIHJldHVybiBoYXNoSW5mby5pc01pbmlmaWVkIHx8IGhhc2hJbmZvLmlzSW5Ob2RlTW9kdWxlcyB8fCBoYXNoSW5mby5oYXNTb3VyY2VNYXAgfHwgaGFzaEluZm8uaXNGaWxlQmluYXJ5O1xuICB9XG5cbiAgLyoqXG4gICAqIExvb2sgYXQgdGhlIGNvZGUgb2YgYSBub2RlIG1vZHVsZXMgYW5kIHNlZSB0aGUgc291cmNlTWFwcGluZyBwYXRoLlxuICAgKiBJZiB0aGVyZSBpcyBhbnksIGNoZWNrIHRoZSBwYXRoIGFuZCB0cnkgdG8gZml4IGl0IHdpdGggYW5kXG4gICAqIHJvb3QgcmVsYXRpdmUgcGF0aC5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIHN0YXRpYyBhc3luYyBmaXhOb2RlTW9kdWxlc1NvdXJjZU1hcHBpbmcoc291cmNlQ29kZSwgc291cmNlUGF0aCwgYXBwUm9vdCkge1xuICAgIGxldCByZWdleFNvdXJjZU1hcHBpbmcgPSAvXFwvXFwvIy4qc291cmNlTWFwcGluZ1VSTD0oPyFkYXRhOikoW15cIiddLiopL2k7XG4gICAgbGV0IHNvdXJjZU1hcHBpbmdDaGVjayA9IHNvdXJjZUNvZGUubWF0Y2gocmVnZXhTb3VyY2VNYXBwaW5nKTtcblxuICAgIGlmIChzb3VyY2VNYXBwaW5nQ2hlY2sgJiYgc291cmNlTWFwcGluZ0NoZWNrWzFdICYmIHNvdXJjZU1hcHBpbmdDaGVja1sxXSAhPT0gJycpe1xuICAgICAgbGV0IHNvdXJjZU1hcFBhdGggPSBzb3VyY2VNYXBwaW5nQ2hlY2tbMV07XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHBmcy5zdGF0KHNvdXJjZU1hcFBhdGgpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgbGV0IG5vcm1Sb290ID0gcGF0aC5ub3JtYWxpemUoYXBwUm9vdCk7XG4gICAgICAgIGxldCBhYnNQYXRoVG9Nb2R1bGUgPSBwYXRoLmRpcm5hbWUoc291cmNlUGF0aC5yZXBsYWNlKG5vcm1Sb290LCAnJykuc3Vic3RyaW5nKDEpKTtcbiAgICAgICAgbGV0IG5ld01hcFBhdGggPSBwYXRoLmpvaW4oYWJzUGF0aFRvTW9kdWxlLCBzb3VyY2VNYXBQYXRoKTtcblxuICAgICAgICByZXR1cm4gc291cmNlQ29kZS5yZXBsYWNlKHJlZ2V4U291cmNlTWFwcGluZywgYC8vIyBzb3VyY2VNYXBwaW5nVVJMPSR7bmV3TWFwUGF0aH1gKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc291cmNlQ29kZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb29rIGF0IHRoZSBjb2RlIG9mIGEgbm9kZSBtb2R1bGVzIGFuZCBzZWUgdGhlIHNvdXJjZU1hcHBpbmcgcGF0aC5cbiAgICogSWYgdGhlcmUgaXMgYW55LCBjaGVjayB0aGUgcGF0aCBhbmQgdHJ5IHRvIGZpeCBpdCB3aXRoIGFuZFxuICAgKiByb290IHJlbGF0aXZlIHBhdGguXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBzdGF0aWMgZml4Tm9kZU1vZHVsZXNTb3VyY2VNYXBwaW5nU3luYyhzb3VyY2VDb2RlLCBzb3VyY2VQYXRoLCBhcHBSb290KSB7XG4gICAgbGV0IHJlZ2V4U291cmNlTWFwcGluZyA9IC9cXC9cXC8jLipzb3VyY2VNYXBwaW5nVVJMPSg/IWRhdGE6KShbXlwiJ10uKikvaTtcbiAgICBsZXQgc291cmNlTWFwcGluZ0NoZWNrID0gc291cmNlQ29kZS5tYXRjaChyZWdleFNvdXJjZU1hcHBpbmcpO1xuXG4gICAgaWYgKHNvdXJjZU1hcHBpbmdDaGVjayAmJiBzb3VyY2VNYXBwaW5nQ2hlY2tbMV0gJiYgc291cmNlTWFwcGluZ0NoZWNrWzFdICE9PSAnJyl7XG4gICAgICBsZXQgc291cmNlTWFwUGF0aCA9IHNvdXJjZU1hcHBpbmdDaGVja1sxXTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgZnMuc3RhdFN5bmMoc291cmNlTWFwUGF0aCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBsZXQgbm9ybVJvb3QgPSBwYXRoLm5vcm1hbGl6ZShhcHBSb290KTtcbiAgICAgICAgbGV0IGFic1BhdGhUb01vZHVsZSA9IHBhdGguZGlybmFtZShzb3VyY2VQYXRoLnJlcGxhY2Uobm9ybVJvb3QsICcnKS5zdWJzdHJpbmcoMSkpO1xuICAgICAgICBsZXQgbmV3TWFwUGF0aCA9IHBhdGguam9pbihhYnNQYXRoVG9Nb2R1bGUsIHNvdXJjZU1hcFBhdGgpO1xuXG4gICAgICAgIHJldHVybiBzb3VyY2VDb2RlLnJlcGxhY2UocmVnZXhTb3VyY2VNYXBwaW5nLCBgLy8jIHNvdXJjZU1hcHBpbmdVUkw9JHtuZXdNYXBQYXRofWApO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzb3VyY2VDb2RlO1xuICB9XG59XG4iXX0=