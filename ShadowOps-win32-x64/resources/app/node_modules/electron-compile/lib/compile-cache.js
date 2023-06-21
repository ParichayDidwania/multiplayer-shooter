'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _zlib = require('zlib');

var _zlib2 = _interopRequireDefault(_zlib);

var _digestForObject = require('./digest-for-object');

var _digestForObject2 = _interopRequireDefault(_digestForObject);

var _promise = require('./promise');

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const d = require('debug')('electron-compile:compile-cache');

/**
 * CompileCache manages getting and setting entries for a single compiler; each
 * in-use compiler will have an instance of this class, usually created via
 * {@link createFromCompiler}.
 *
 * You usually will not use this class directly, it is an implementation class
 * for {@link CompileHost}.
 */
class CompileCache {
  /**
   * Creates an instance, usually used for testing only.
   *
   * @param  {string} cachePath  The root directory to use as a cache path
   *
   * @param  {FileChangedCache} fileChangeCache  A file-change cache that is
   *                                             optionally pre-loaded.
   * @param {string} sourceMapPath The directory to store sourcemap separately if compiler option enabled to emit.
   *                               Default to cachePath if not specified.
   */
  constructor(cachePath, fileChangeCache) {
    let sourceMapPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

    this.cachePath = cachePath;
    this.fileChangeCache = fileChangeCache;
    this.sourceMapPath = sourceMapPath || this.cachePath;
  }

  /**
   * Creates a CompileCache from a class compatible with the CompilerBase
   * interface. This method uses the compiler name / version / options to
   * generate a unique directory name for cached results
   *
   * @param  {string} cachePath  The root path to use for the cache, a directory
   *                             representing the hash of the compiler parameters
   *                             will be created here.
   *
   * @param  {CompilerBase} compiler  The compiler to use for version / option
   *                                  information.
   *
   * @param  {FileChangedCache} fileChangeCache  A file-change cache that is
   *                                             optionally pre-loaded.
   *
   * @param  {boolean} readOnlyMode  Don't attempt to create the cache directory.
   *
   * @param {string} sourceMapPath The directory to store sourcemap separately if compiler option enabled to emit.
   *                               Default to cachePath if not specified.
   *
   * @return {CompileCache}  A configured CompileCache instance.
   */
  static createFromCompiler(cachePath, compiler, fileChangeCache) {
    let readOnlyMode = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
    let sourceMapPath = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;

    let newCachePath = null;
    let getCachePath = () => {
      if (newCachePath) return newCachePath;

      const digestObj = {
        name: compiler.name || Object.getPrototypeOf(compiler).constructor.name,
        version: compiler.getCompilerVersion(),
        options: compiler.compilerOptions
      };

      newCachePath = _path2.default.join(cachePath, (0, _digestForObject2.default)(digestObj));

      d(`Path for ${digestObj.name}: ${newCachePath}`);
      d(`Set up with parameters: ${JSON.stringify(digestObj)}`);

      if (!readOnlyMode) _mkdirp2.default.sync(newCachePath);
      return newCachePath;
    };

    let ret = new CompileCache('', fileChangeCache);
    ret.getCachePath = getCachePath;

    const newSourceMapPath = sourceMapPath;
    ret.getSourceMapPath = () => newSourceMapPath || getCachePath();

    return ret;
  }

  /**
   * Returns a file's compiled contents from the cache.
   *
   * @param  {string} filePath  The path to the file. FileChangedCache will look
   *                            up the hash and use that as the key in the cache.
   *
   * @return {Promise<Object>}  An object with all kinds of information
   *
   * @property {Object} hashInfo  The hash information returned from getHashForPath
   * @property {string} code  The source code if the file was a text file
   * @property {Buffer} binaryData  The file if it was a binary file
   * @property {string} mimeType  The MIME type saved in the cache.
   * @property {string[]} dependentFiles  The dependent files returned from
   *                                      compiling the file, if any.
   */
  get(filePath) {
    var _this = this;

    return _asyncToGenerator(function* () {
      d(`Fetching ${filePath} from cache`);
      let hashInfo = yield _this.fileChangeCache.getHashForPath(_path2.default.resolve(filePath));

      let code = null;
      let mimeType = null;
      let binaryData = null;
      let dependentFiles = null;

      let cacheFile = null;
      try {
        cacheFile = _path2.default.join(_this.getCachePath(), hashInfo.hash);
        let result = null;

        if (hashInfo.isFileBinary) {
          d("File is binary, reading out info");
          let info = JSON.parse((yield _promise.pfs.readFile(cacheFile + '.info')));
          mimeType = info.mimeType;
          dependentFiles = info.dependentFiles;

          binaryData = hashInfo.binaryData;
          if (!binaryData) {
            binaryData = yield _promise.pfs.readFile(cacheFile);
            binaryData = yield _promise.pzlib.gunzip(binaryData);
          }
        } else {
          let buf = yield _promise.pfs.readFile(cacheFile);
          let str = (yield _promise.pzlib.gunzip(buf)).toString('utf8');

          result = JSON.parse(str);
          code = result.code;
          mimeType = result.mimeType;
          dependentFiles = result.dependentFiles;
        }
      } catch (e) {
        d(`Failed to read cache for ${filePath}, looked in ${cacheFile}: ${e.message}`);
      }

      return { hashInfo, code, mimeType, binaryData, dependentFiles };
    })();
  }

  /**
   * Saves a compiled result to cache
   *
   * @param  {Object} hashInfo  The hash information returned from getHashForPath
   *
   * @param  {string / Buffer} codeOrBinaryData   The file's contents, either as
   *                                              a string or a Buffer.
   * @param  {string} mimeType  The MIME type returned by the compiler.
   *
   * @param  {string[]} dependentFiles  The list of dependent files returned by
   *                                    the compiler.
   * @return {Promise}  Completion.
   */
  save(hashInfo, codeOrBinaryData, mimeType, dependentFiles) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      let buf = null;
      let target = _path2.default.join(_this2.getCachePath(), hashInfo.hash);
      d(`Saving to ${target}`);

      if (hashInfo.isFileBinary) {
        buf = yield _promise.pzlib.gzip(codeOrBinaryData);
        yield _promise.pfs.writeFile(target + '.info', JSON.stringify({ mimeType, dependentFiles }), 'utf8');
      } else {
        buf = yield _promise.pzlib.gzip(new Buffer(JSON.stringify({ code: codeOrBinaryData, mimeType, dependentFiles })));
      }

      yield _promise.pfs.writeFile(target, buf);
    })();
  }

  /**
   * Attempts to first get a key via {@link get}, then if it fails, call a method
   * to retrieve the contents, then save the result to cache.
   *
   * The fetcher parameter is expected to have the signature:
   *
   * Promise<Object> fetcher(filePath : string, hashInfo : Object);
   *
   * hashInfo is a value returned from getHashForPath
   * The return value of fetcher must be an Object with the properties:
   *
   * mimeType - the MIME type of the data to save
   * code (optional) - the source code as a string, if file is text
   * binaryData (optional) - the file contents as a Buffer, if file is binary
   * dependentFiles - the dependent files returned by the compiler.
   *
   * @param  {string} filePath  The path to the file. FileChangedCache will look
   *                            up the hash and use that as the key in the cache.
   *
   * @param  {Function} fetcher  A method which conforms to the description above.
   *
   * @return {Promise<Object>}  An Object which has the same fields as the
   *                            {@link get} method return result.
   */
  getOrFetch(filePath, fetcher) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      let cacheResult = yield _this3.get(filePath);
      let anyDependenciesChanged = yield _this3.haveAnyDependentFilesChanged(cacheResult);

      if ((cacheResult.code || cacheResult.binaryData) && !anyDependenciesChanged) {
        return cacheResult;
      }

      let result = (yield fetcher(filePath, cacheResult.hashInfo)) || { hashInfo: cacheResult.hashInfo };

      if (result.mimeType && !cacheResult.hashInfo.isInNodeModules) {
        d(`Cache miss: saving out info for ${filePath}`);
        yield _this3.save(cacheResult.hashInfo, result.code || result.binaryData, result.mimeType, result.dependentFiles);

        const map = result.sourceMaps;
        if (map) {
          d(`source map for ${filePath} found, saving it to ${_this3.getSourceMapPath()}`);
          yield _this3.saveSourceMap(cacheResult.hashInfo, filePath, map);
        }
      }

      result.hashInfo = cacheResult.hashInfo;
      return result;
    })();
  }

  /**
   * @private Check if any of a file's dependencies have changed
   */
  haveAnyDependentFilesChanged(cacheResult) {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      if (!cacheResult.code || !cacheResult.dependentFiles.length) return false;

      for (let dependentFile of cacheResult.dependentFiles) {
        let hasFileChanged = yield _this4.fileChangeCache.hasFileChanged(dependentFile);
        if (hasFileChanged) {
          return true;
        }

        let dependentFileCacheResult = yield _this4.get(dependentFile);
        if (dependentFileCacheResult.dependentFiles && dependentFileCacheResult.dependentFiles.length) {
          let anySubdependentFilesChanged = yield _this4.haveAnyDependentFilesChanged(dependentFileCacheResult);
          if (anySubdependentFilesChanged) return true;
        }
      }

      return false;
    })();
  }

  getSync(filePath) {
    d(`Fetching ${filePath} from cache`);
    let hashInfo = this.fileChangeCache.getHashForPathSync(_path2.default.resolve(filePath));

    let code = null;
    let mimeType = null;
    let binaryData = null;
    let dependentFiles = null;

    try {
      let cacheFile = _path2.default.join(this.getCachePath(), hashInfo.hash);

      let result = null;
      if (hashInfo.isFileBinary) {
        d("File is binary, reading out info");
        let info = JSON.parse(_fs2.default.readFileSync(cacheFile + '.info'));
        mimeType = info.mimeType;
        dependentFiles = info.dependentFiles;

        binaryData = hashInfo.binaryData;
        if (!binaryData) {
          binaryData = _fs2.default.readFileSync(cacheFile);
          binaryData = _zlib2.default.gunzipSync(binaryData);
        }
      } else {
        let buf = _fs2.default.readFileSync(cacheFile);
        let str = _zlib2.default.gunzipSync(buf).toString('utf8');

        result = JSON.parse(str);
        code = result.code;
        mimeType = result.mimeType;
        dependentFiles = result.dependentFiles;
      }
    } catch (e) {
      d(`Failed to read cache for ${filePath}`);
    }

    return { hashInfo, code, mimeType, binaryData, dependentFiles };
  }

  saveSync(hashInfo, codeOrBinaryData, mimeType, dependentFiles) {
    let buf = null;
    let target = _path2.default.join(this.getCachePath(), hashInfo.hash);
    d(`Saving to ${target}`);

    if (hashInfo.isFileBinary) {
      buf = _zlib2.default.gzipSync(codeOrBinaryData);
      _fs2.default.writeFileSync(target + '.info', JSON.stringify({ mimeType, dependentFiles }), 'utf8');
    } else {
      buf = _zlib2.default.gzipSync(new Buffer(JSON.stringify({ code: codeOrBinaryData, mimeType, dependentFiles })));
    }

    _fs2.default.writeFileSync(target, buf);
  }

  getOrFetchSync(filePath, fetcher) {
    let cacheResult = this.getSync(filePath);
    if (cacheResult.code || cacheResult.binaryData) return cacheResult;

    let result = fetcher(filePath, cacheResult.hashInfo) || { hashInfo: cacheResult.hashInfo };

    if (result.mimeType && !cacheResult.hashInfo.isInNodeModules) {
      d(`Cache miss: saving out info for ${filePath}`);
      this.saveSync(cacheResult.hashInfo, result.code || result.binaryData, result.mimeType, result.dependentFiles);
    }

    const map = result.sourceMaps;
    if (map) {
      d(`source map for ${filePath} found, saving it to ${this.getSourceMapPath()}`);
      this.saveSourceMapSync(cacheResult.hashInfo, filePath, map);
    }

    result.hashInfo = cacheResult.hashInfo;
    return result;
  }

  buildSourceMapTarget(hashInfo, filePath) {
    const fileName = _path2.default.basename(filePath);
    const mapFileName = fileName.replace(_path2.default.extname(fileName), '.js.map');

    const target = _path2.default.join(this.getSourceMapPath(), mapFileName);
    d(`Sourcemap target is: ${target}`);

    return target;
  }

  /**
   * Saves sourcemap string into cache, or specified separate dir
   *
   * @param  {Object} hashInfo  The hash information returned from getHashForPath
   *
   * @param  {string} filePath Path to original file to construct sourcemap file name
    * @param  {string} sourceMap Sourcemap data as string
   *
   * @memberOf CompileCache
   */
  saveSourceMap(hashInfo, filePath, sourceMap) {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      const target = _this5.buildSourceMapTarget(hashInfo, filePath);
      yield _promise.pfs.writeFile(target, sourceMap, 'utf-8');
    })();
  }

  saveSourceMapSync(hashInfo, filePath, sourceMap) {
    const target = this.buildSourceMapTarget(hashInfo, filePath);
    _fs2.default.writeFileSync(target, sourceMap, 'utf-8');
  }

  /**
   * @private
   */
  getCachePath() {
    // NB: This is an evil hack so that createFromCompiler can stomp it
    // at will
    return this.cachePath;
  }

  /**
   * @private
   */
  getSourceMapPath() {
    return this.sourceMapPath;
  }

  /**
   * Returns whether a file should not be compiled. Note that this doesn't
   * necessarily mean it won't end up in the cache, only that its contents are
   * saved verbatim instead of trying to find an appropriate compiler.
   *
   * @param  {Object} hashInfo  The hash information returned from getHashForPath
   *
   * @return {boolean}  True if a file should be ignored
   */
  static shouldPassthrough(hashInfo) {
    return hashInfo.isMinified || hashInfo.isInNodeModules || hashInfo.hasSourceMap || hashInfo.isFileBinary;
  }
}
exports.default = CompileCache;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jb21waWxlLWNhY2hlLmpzIl0sIm5hbWVzIjpbImQiLCJyZXF1aXJlIiwiQ29tcGlsZUNhY2hlIiwiY29uc3RydWN0b3IiLCJjYWNoZVBhdGgiLCJmaWxlQ2hhbmdlQ2FjaGUiLCJzb3VyY2VNYXBQYXRoIiwiY3JlYXRlRnJvbUNvbXBpbGVyIiwiY29tcGlsZXIiLCJyZWFkT25seU1vZGUiLCJuZXdDYWNoZVBhdGgiLCJnZXRDYWNoZVBhdGgiLCJkaWdlc3RPYmoiLCJuYW1lIiwiT2JqZWN0IiwiZ2V0UHJvdG90eXBlT2YiLCJ2ZXJzaW9uIiwiZ2V0Q29tcGlsZXJWZXJzaW9uIiwib3B0aW9ucyIsImNvbXBpbGVyT3B0aW9ucyIsInBhdGgiLCJqb2luIiwiSlNPTiIsInN0cmluZ2lmeSIsIm1rZGlycCIsInN5bmMiLCJyZXQiLCJuZXdTb3VyY2VNYXBQYXRoIiwiZ2V0U291cmNlTWFwUGF0aCIsImdldCIsImZpbGVQYXRoIiwiaGFzaEluZm8iLCJnZXRIYXNoRm9yUGF0aCIsInJlc29sdmUiLCJjb2RlIiwibWltZVR5cGUiLCJiaW5hcnlEYXRhIiwiZGVwZW5kZW50RmlsZXMiLCJjYWNoZUZpbGUiLCJoYXNoIiwicmVzdWx0IiwiaXNGaWxlQmluYXJ5IiwiaW5mbyIsInBhcnNlIiwicGZzIiwicmVhZEZpbGUiLCJwemxpYiIsImd1bnppcCIsImJ1ZiIsInN0ciIsInRvU3RyaW5nIiwiZSIsIm1lc3NhZ2UiLCJzYXZlIiwiY29kZU9yQmluYXJ5RGF0YSIsInRhcmdldCIsImd6aXAiLCJ3cml0ZUZpbGUiLCJCdWZmZXIiLCJnZXRPckZldGNoIiwiZmV0Y2hlciIsImNhY2hlUmVzdWx0IiwiYW55RGVwZW5kZW5jaWVzQ2hhbmdlZCIsImhhdmVBbnlEZXBlbmRlbnRGaWxlc0NoYW5nZWQiLCJpc0luTm9kZU1vZHVsZXMiLCJtYXAiLCJzb3VyY2VNYXBzIiwic2F2ZVNvdXJjZU1hcCIsImxlbmd0aCIsImRlcGVuZGVudEZpbGUiLCJoYXNGaWxlQ2hhbmdlZCIsImRlcGVuZGVudEZpbGVDYWNoZVJlc3VsdCIsImFueVN1YmRlcGVuZGVudEZpbGVzQ2hhbmdlZCIsImdldFN5bmMiLCJnZXRIYXNoRm9yUGF0aFN5bmMiLCJmcyIsInJlYWRGaWxlU3luYyIsInpsaWIiLCJndW56aXBTeW5jIiwic2F2ZVN5bmMiLCJnemlwU3luYyIsIndyaXRlRmlsZVN5bmMiLCJnZXRPckZldGNoU3luYyIsInNhdmVTb3VyY2VNYXBTeW5jIiwiYnVpbGRTb3VyY2VNYXBUYXJnZXQiLCJmaWxlTmFtZSIsImJhc2VuYW1lIiwibWFwRmlsZU5hbWUiLCJyZXBsYWNlIiwiZXh0bmFtZSIsInNvdXJjZU1hcCIsInNob3VsZFBhc3N0aHJvdWdoIiwiaXNNaW5pZmllZCIsImhhc1NvdXJjZU1hcCJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7Ozs7Ozs7QUFFQSxNQUFNQSxJQUFJQyxRQUFRLE9BQVIsRUFBaUIsZ0NBQWpCLENBQVY7O0FBRUE7Ozs7Ozs7O0FBUWUsTUFBTUMsWUFBTixDQUFtQjtBQUNoQzs7Ozs7Ozs7OztBQVVBQyxjQUFZQyxTQUFaLEVBQXVCQyxlQUF2QixFQUE4RDtBQUFBLFFBQXRCQyxhQUFzQix1RUFBTixJQUFNOztBQUM1RCxTQUFLRixTQUFMLEdBQWlCQSxTQUFqQjtBQUNBLFNBQUtDLGVBQUwsR0FBdUJBLGVBQXZCO0FBQ0EsU0FBS0MsYUFBTCxHQUFxQkEsaUJBQWlCLEtBQUtGLFNBQTNDO0FBQ0Q7O0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFzQkEsU0FBT0csa0JBQVAsQ0FBMEJILFNBQTFCLEVBQXFDSSxRQUFyQyxFQUErQ0gsZUFBL0MsRUFBNEc7QUFBQSxRQUE1Q0ksWUFBNEMsdUVBQTdCLEtBQTZCO0FBQUEsUUFBdEJILGFBQXNCLHVFQUFOLElBQU07O0FBQzFHLFFBQUlJLGVBQWUsSUFBbkI7QUFDQSxRQUFJQyxlQUFlLE1BQU07QUFDdkIsVUFBSUQsWUFBSixFQUFr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ZS1jYWNoZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB6bGliIGZyb20gJ3psaWInO1xuaW1wb3J0IGNyZWF0ZURpZ2VzdEZvck9iamVjdCBmcm9tICcuL2RpZ2VzdC1mb3Itb2JqZWN0JztcbmltcG9ydCB7cGZzLCBwemxpYn0gZnJvbSAnLi9wcm9taXNlJztcbmltcG9ydCBta2RpcnAgZnJvbSAnbWtkaXJwJztcblxuY29uc3QgZCA9IHJlcXVpcmUoJ2RlYnVnJykoJ2VsZWN0cm9uLWNvbXBpbGU6Y29tcGlsZS1jYWNoZScpO1xuXG4vKipcbiAqIENvbXBpbGVDYWNoZSBtYW5hZ2VzIGdldHRpbmcgYW5kIHNldHRpbmcgZW50cmllcyBmb3IgYSBzaW5nbGUgY29tcGlsZXI7IGVhY2hcbiAqIGluLXVzZSBjb21waWxlciB3aWxsIGhhdmUgYW4gaW5zdGFuY2Ugb2YgdGhpcyBjbGFzcywgdXN1YWxseSBjcmVhdGVkIHZpYVxuICoge0BsaW5rIGNyZWF0ZUZyb21Db21waWxlcn0uXG4gKlxuICogWW91IHVzdWFsbHkgd2lsbCBub3QgdXNlIHRoaXMgY2xhc3MgZGlyZWN0bHksIGl0IGlzIGFuIGltcGxlbWVudGF0aW9uIGNsYXNzXG4gKiBmb3Ige0BsaW5rIENvbXBpbGVIb3N0fS5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ29tcGlsZUNhY2hlIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gaW5zdGFuY2UsIHVzdWFsbHkgdXNlZCBmb3IgdGVzdGluZyBvbmx5LlxuICAgKlxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IGNhY2hlUGF0aCAgVGhlIHJvb3QgZGlyZWN0b3J5IHRvIHVzZSBhcyBhIGNhY2hlIHBhdGhcbiAgICpcbiAgICogQHBhcmFtICB7RmlsZUNoYW5nZWRDYWNoZX0gZmlsZUNoYW5nZUNhY2hlICBBIGZpbGUtY2hhbmdlIGNhY2hlIHRoYXQgaXNcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25hbGx5IHByZS1sb2FkZWQuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBzb3VyY2VNYXBQYXRoIFRoZSBkaXJlY3RvcnkgdG8gc3RvcmUgc291cmNlbWFwIHNlcGFyYXRlbHkgaWYgY29tcGlsZXIgb3B0aW9uIGVuYWJsZWQgdG8gZW1pdC5cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRGVmYXVsdCB0byBjYWNoZVBhdGggaWYgbm90IHNwZWNpZmllZC5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGNhY2hlUGF0aCwgZmlsZUNoYW5nZUNhY2hlLCBzb3VyY2VNYXBQYXRoID0gbnVsbCkge1xuICAgIHRoaXMuY2FjaGVQYXRoID0gY2FjaGVQYXRoO1xuICAgIHRoaXMuZmlsZUNoYW5nZUNhY2hlID0gZmlsZUNoYW5nZUNhY2hlO1xuICAgIHRoaXMuc291cmNlTWFwUGF0aCA9IHNvdXJjZU1hcFBhdGggfHwgdGhpcy5jYWNoZVBhdGg7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIENvbXBpbGVDYWNoZSBmcm9tIGEgY2xhc3MgY29tcGF0aWJsZSB3aXRoIHRoZSBDb21waWxlckJhc2VcbiAgICogaW50ZXJmYWNlLiBUaGlzIG1ldGhvZCB1c2VzIHRoZSBjb21waWxlciBuYW1lIC8gdmVyc2lvbiAvIG9wdGlvbnMgdG9cbiAgICogZ2VuZXJhdGUgYSB1bmlxdWUgZGlyZWN0b3J5IG5hbWUgZm9yIGNhY2hlZCByZXN1bHRzXG4gICAqXG4gICAqIEBwYXJhbSAge3N0cmluZ30gY2FjaGVQYXRoICBUaGUgcm9vdCBwYXRoIHRvIHVzZSBmb3IgdGhlIGNhY2hlLCBhIGRpcmVjdG9yeVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVwcmVzZW50aW5nIHRoZSBoYXNoIG9mIHRoZSBjb21waWxlciBwYXJhbWV0ZXJzXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWxsIGJlIGNyZWF0ZWQgaGVyZS5cbiAgICpcbiAgICogQHBhcmFtICB7Q29tcGlsZXJCYXNlfSBjb21waWxlciAgVGhlIGNvbXBpbGVyIHRvIHVzZSBmb3IgdmVyc2lvbiAvIG9wdGlvblxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmZvcm1hdGlvbi5cbiAgICpcbiAgICogQHBhcmFtICB7RmlsZUNoYW5nZWRDYWNoZX0gZmlsZUNoYW5nZUNhY2hlICBBIGZpbGUtY2hhbmdlIGNhY2hlIHRoYXQgaXNcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25hbGx5IHByZS1sb2FkZWQuXG4gICAqXG4gICAqIEBwYXJhbSAge2Jvb2xlYW59IHJlYWRPbmx5TW9kZSAgRG9uJ3QgYXR0ZW1wdCB0byBjcmVhdGUgdGhlIGNhY2hlIGRpcmVjdG9yeS5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHNvdXJjZU1hcFBhdGggVGhlIGRpcmVjdG9yeSB0byBzdG9yZSBzb3VyY2VtYXAgc2VwYXJhdGVseSBpZiBjb21waWxlciBvcHRpb24gZW5hYmxlZCB0byBlbWl0LlxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBEZWZhdWx0IHRvIGNhY2hlUGF0aCBpZiBub3Qgc3BlY2lmaWVkLlxuICAgKlxuICAgKiBAcmV0dXJuIHtDb21waWxlQ2FjaGV9ICBBIGNvbmZpZ3VyZWQgQ29tcGlsZUNhY2hlIGluc3RhbmNlLlxuICAgKi9cbiAgc3RhdGljIGNyZWF0ZUZyb21Db21waWxlcihjYWNoZVBhdGgsIGNvbXBpbGVyLCBmaWxlQ2hhbmdlQ2FjaGUsIHJlYWRPbmx5TW9kZSA9IGZhbHNlLCBzb3VyY2VNYXBQYXRoID0gbnVsbCkge1xuICAgIGxldCBuZXdDYWNoZVBhdGggPSBudWxsO1xuICAgIGxldCBnZXRDYWNoZVBhdGggPSAoKSA9PiB7XG4gICAgICBpZiAobmV3Q2FjaGVQYXRoKSByZXR1cm4gbmV3Q2FjaGVQYXRoO1xuXG4gICAgICBjb25zdCBkaWdlc3RPYmogPSB7XG4gICAgICAgIG5hbWU6IGNvbXBpbGVyLm5hbWUgfHwgT2JqZWN0LmdldFByb3RvdHlwZU9mKGNvbXBpbGVyKS5jb25zdHJ1Y3Rvci5uYW1lLFxuICAgICAgICB2ZXJzaW9uOiBjb21waWxlci5nZXRDb21waWxlclZlcnNpb24oKSxcbiAgICAgICAgb3B0aW9uczogY29tcGlsZXIuY29tcGlsZXJPcHRpb25zXG4gICAgICB9O1xuXG4gICAgICBuZXdDYWNoZVBhdGggPSBwYXRoLmpvaW4oY2FjaGVQYXRoLCBjcmVhdGVEaWdlc3RGb3JPYmplY3QoZGlnZXN0T2JqKSk7XG5cbiAgICAgIGQoYFBhdGggZm9yICR7ZGlnZXN0T2JqLm5hbWV9OiAke25ld0NhY2hlUGF0aH1gKTtcbiAgICAgIGQoYFNldCB1cCB3aXRoIHBhcmFtZXRlcnM6ICR7SlNPTi5zdHJpbmdpZnkoZGlnZXN0T2JqKX1gKTtcblxuICAgICAgaWYgKCFyZWFkT25seU1vZGUpIG1rZGlycC5zeW5jKG5ld0NhY2hlUGF0aCk7XG4gICAgICByZXR1cm4gbmV3Q2FjaGVQYXRoO1xuICAgIH07XG5cbiAgICBsZXQgcmV0ID0gbmV3IENvbXBpbGVDYWNoZSgnJywgZmlsZUNoYW5nZUNhY2hlKTtcbiAgICByZXQuZ2V0Q2FjaGVQYXRoID0gZ2V0Q2FjaGVQYXRoO1xuXG4gICAgY29uc3QgbmV3U291cmNlTWFwUGF0aCA9IHNvdXJjZU1hcFBhdGg7XG4gICAgcmV0LmdldFNvdXJjZU1hcFBhdGggPSAoKSA9PiBuZXdTb3VyY2VNYXBQYXRoIHx8IGdldENhY2hlUGF0aCgpO1xuXG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgZmlsZSdzIGNvbXBpbGVkIGNvbnRlbnRzIGZyb20gdGhlIGNhY2hlLlxuICAgKlxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IGZpbGVQYXRoICBUaGUgcGF0aCB0byB0aGUgZmlsZS4gRmlsZUNoYW5nZWRDYWNoZSB3aWxsIGxvb2tcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgdXAgdGhlIGhhc2ggYW5kIHVzZSB0aGF0IGFzIHRoZSBrZXkgaW4gdGhlIGNhY2hlLlxuICAgKlxuICAgKiBAcmV0dXJuIHtQcm9taXNlPE9iamVjdD59ICBBbiBvYmplY3Qgd2l0aCBhbGwga2luZHMgb2YgaW5mb3JtYXRpb25cbiAgICpcbiAgICogQHByb3BlcnR5IHtPYmplY3R9IGhhc2hJbmZvICBUaGUgaGFzaCBpbmZvcm1hdGlvbiByZXR1cm5lZCBmcm9tIGdldEhhc2hGb3JQYXRoXG4gICAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBjb2RlICBUaGUgc291cmNlIGNvZGUgaWYgdGhlIGZpbGUgd2FzIGEgdGV4dCBmaWxlXG4gICAqIEBwcm9wZXJ0eSB7QnVmZmVyfSBiaW5hcnlEYXRhICBUaGUgZmlsZSBpZiBpdCB3YXMgYSBiaW5hcnkgZmlsZVxuICAgKiBAcHJvcGVydHkge3N0cmluZ30gbWltZVR5cGUgIFRoZSBNSU1FIHR5cGUgc2F2ZWQgaW4gdGhlIGNhY2hlLlxuICAgKiBAcHJvcGVydHkge3N0cmluZ1tdfSBkZXBlbmRlbnRGaWxlcyAgVGhlIGRlcGVuZGVudCBmaWxlcyByZXR1cm5lZCBmcm9tXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21waWxpbmcgdGhlIGZpbGUsIGlmIGFueS5cbiAgICovXG4gIGFzeW5jIGdldChmaWxlUGF0aCkge1xuICAgIGQoYEZldGNoaW5nICR7ZmlsZVBhdGh9IGZyb20gY2FjaGVgKTtcbiAgICBsZXQgaGFzaEluZm8gPSBhd2FpdCB0aGlzLmZpbGVDaGFuZ2VDYWNoZS5nZXRIYXNoRm9yUGF0aChwYXRoLnJlc29sdmUoZmlsZVBhdGgpKTtcblxuICAgIGxldCBjb2RlID0gbnVsbDtcbiAgICBsZXQgbWltZVR5cGUgPSBudWxsO1xuICAgIGxldCBiaW5hcnlEYXRhID0gbnVsbDtcbiAgICBsZXQgZGVwZW5kZW50RmlsZXMgPSBudWxsO1xuXG4gICAgbGV0IGNhY2hlRmlsZSA9IG51bGw7XG4gICAgdHJ5IHtcbiAgICAgIGNhY2hlRmlsZSA9IHBhdGguam9pbih0aGlzLmdldENhY2hlUGF0aCgpLCBoYXNoSW5mby5oYXNoKTtcbiAgICAgIGxldCByZXN1bHQgPSBudWxsO1xuXG4gICAgICBpZiAoaGFzaEluZm8uaXNGaWxlQmluYXJ5KSB7XG4gICAgICAgIGQoXCJGaWxlIGlzIGJpbmFyeSwgcmVhZGluZyBvdXQgaW5mb1wiKTtcbiAgICAgICAgbGV0IGluZm8gPSBKU09OLnBhcnNlKGF3YWl0IHBmcy5yZWFkRmlsZShjYWNoZUZpbGUgKyAnLmluZm8nKSk7XG4gICAgICAgIG1pbWVUeXBlID0gaW5mby5taW1lVHlwZTtcbiAgICAgICAgZGVwZW5kZW50RmlsZXMgPSBpbmZvLmRlcGVuZGVudEZpbGVzO1xuXG4gICAgICAgIGJpbmFyeURhdGEgPSBoYXNoSW5mby5iaW5hcnlEYXRhO1xuICAgICAgICBpZiAoIWJpbmFyeURhdGEpIHtcbiAgICAgICAgICBiaW5hcnlEYXRhID0gYXdhaXQgcGZzLnJlYWRGaWxlKGNhY2hlRmlsZSk7XG4gICAgICAgICAgYmluYXJ5RGF0YSA9IGF3YWl0IHB6bGliLmd1bnppcChiaW5hcnlEYXRhKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IGJ1ZiA9IGF3YWl0IHBmcy5yZWFkRmlsZShjYWNoZUZpbGUpO1xuICAgICAgICBsZXQgc3RyID0gKGF3YWl0IHB6bGliLmd1bnppcChidWYpKS50b1N0cmluZygndXRmOCcpO1xuXG4gICAgICAgIHJlc3VsdCA9IEpTT04ucGFyc2Uoc3RyKTtcbiAgICAgICAgY29kZSA9IHJlc3VsdC5jb2RlO1xuICAgICAgICBtaW1lVHlwZSA9IHJlc3VsdC5taW1lVHlwZTtcbiAgICAgICAgZGVwZW5kZW50RmlsZXMgPSByZXN1bHQuZGVwZW5kZW50RmlsZXM7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgZChgRmFpbGVkIHRvIHJlYWQgY2FjaGUgZm9yICR7ZmlsZVBhdGh9LCBsb29rZWQgaW4gJHtjYWNoZUZpbGV9OiAke2UubWVzc2FnZX1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4geyBoYXNoSW5mbywgY29kZSwgbWltZVR5cGUsIGJpbmFyeURhdGEsIGRlcGVuZGVudEZpbGVzIH07XG4gIH1cblxuXG4gIC8qKlxuICAgKiBTYXZlcyBhIGNvbXBpbGVkIHJlc3VsdCB0byBjYWNoZVxuICAgKlxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGhhc2hJbmZvICBUaGUgaGFzaCBpbmZvcm1hdGlvbiByZXR1cm5lZCBmcm9tIGdldEhhc2hGb3JQYXRoXG4gICAqXG4gICAqIEBwYXJhbSAge3N0cmluZyAvIEJ1ZmZlcn0gY29kZU9yQmluYXJ5RGF0YSAgIFRoZSBmaWxlJ3MgY29udGVudHMsIGVpdGhlciBhc1xuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhIHN0cmluZyBvciBhIEJ1ZmZlci5cbiAgICogQHBhcmFtICB7c3RyaW5nfSBtaW1lVHlwZSAgVGhlIE1JTUUgdHlwZSByZXR1cm5lZCBieSB0aGUgY29tcGlsZXIuXG4gICAqXG4gICAqIEBwYXJhbSAge3N0cmluZ1tdfSBkZXBlbmRlbnRGaWxlcyAgVGhlIGxpc3Qgb2YgZGVwZW5kZW50IGZpbGVzIHJldHVybmVkIGJ5XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlIGNvbXBpbGVyLlxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSAgQ29tcGxldGlvbi5cbiAgICovXG4gIGFzeW5jIHNhdmUoaGFzaEluZm8sIGNvZGVPckJpbmFyeURhdGEsIG1pbWVUeXBlLCBkZXBlbmRlbnRGaWxlcykge1xuICAgIGxldCBidWYgPSBudWxsO1xuICAgIGxldCB0YXJnZXQgPSBwYXRoLmpvaW4odGhpcy5nZXRDYWNoZVBhdGgoKSwgaGFzaEluZm8uaGFzaCk7XG4gICAgZChgU2F2aW5nIHRvICR7dGFyZ2V0fWApO1xuXG4gICAgaWYgKGhhc2hJbmZvLmlzRmlsZUJpbmFyeSkge1xuICAgICAgYnVmID0gYXdhaXQgcHpsaWIuZ3ppcChjb2RlT3JCaW5hcnlEYXRhKTtcbiAgICAgIGF3YWl0IHBmcy53cml0ZUZpbGUodGFyZ2V0ICsgJy5pbmZvJywgSlNPTi5zdHJpbmdpZnkoe21pbWVUeXBlLCBkZXBlbmRlbnRGaWxlc30pLCAndXRmOCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBidWYgPSBhd2FpdCBwemxpYi5nemlwKG5ldyBCdWZmZXIoSlNPTi5zdHJpbmdpZnkoe2NvZGU6IGNvZGVPckJpbmFyeURhdGEsIG1pbWVUeXBlLCBkZXBlbmRlbnRGaWxlc30pKSk7XG4gICAgfVxuXG4gICAgYXdhaXQgcGZzLndyaXRlRmlsZSh0YXJnZXQsIGJ1Zik7XG4gIH1cblxuICAvKipcbiAgICogQXR0ZW1wdHMgdG8gZmlyc3QgZ2V0IGEga2V5IHZpYSB7QGxpbmsgZ2V0fSwgdGhlbiBpZiBpdCBmYWlscywgY2FsbCBhIG1ldGhvZFxuICAgKiB0byByZXRyaWV2ZSB0aGUgY29udGVudHMsIHRoZW4gc2F2ZSB0aGUgcmVzdWx0IHRvIGNhY2hlLlxuICAgKlxuICAgKiBUaGUgZmV0Y2hlciBwYXJhbWV0ZXIgaXMgZXhwZWN0ZWQgdG8gaGF2ZSB0aGUgc2lnbmF0dXJlOlxuICAgKlxuICAgKiBQcm9taXNlPE9iamVjdD4gZmV0Y2hlcihmaWxlUGF0aCA6IHN0cmluZywgaGFzaEluZm8gOiBPYmplY3QpO1xuICAgKlxuICAgKiBoYXNoSW5mbyBpcyBhIHZhbHVlIHJldHVybmVkIGZyb20gZ2V0SGFzaEZvclBhdGhcbiAgICogVGhlIHJldHVybiB2YWx1ZSBvZiBmZXRjaGVyIG11c3QgYmUgYW4gT2JqZWN0IHdpdGggdGhlIHByb3BlcnRpZXM6XG4gICAqXG4gICAqIG1pbWVUeXBlIC0gdGhlIE1JTUUgdHlwZSBvZiB0aGUgZGF0YSB0byBzYXZlXG4gICAqIGNvZGUgKG9wdGlvbmFsKSAtIHRoZSBzb3VyY2UgY29kZSBhcyBhIHN0cmluZywgaWYgZmlsZSBpcyB0ZXh0XG4gICAqIGJpbmFyeURhdGEgKG9wdGlvbmFsKSAtIHRoZSBmaWxlIGNvbnRlbnRzIGFzIGEgQnVmZmVyLCBpZiBmaWxlIGlzIGJpbmFyeVxuICAgKiBkZXBlbmRlbnRGaWxlcyAtIHRoZSBkZXBlbmRlbnQgZmlsZXMgcmV0dXJuZWQgYnkgdGhlIGNvbXBpbGVyLlxuICAgKlxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IGZpbGVQYXRoICBUaGUgcGF0aCB0byB0aGUgZmlsZS4gRmlsZUNoYW5nZWRDYWNoZSB3aWxsIGxvb2tcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgdXAgdGhlIGhhc2ggYW5kIHVzZSB0aGF0IGFzIHRoZSBrZXkgaW4gdGhlIGNhY2hlLlxuICAgKlxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZmV0Y2hlciAgQSBtZXRob2Qgd2hpY2ggY29uZm9ybXMgdG8gdGhlIGRlc2NyaXB0aW9uIGFib3ZlLlxuICAgKlxuICAgKiBAcmV0dXJuIHtQcm9taXNlPE9iamVjdD59ICBBbiBPYmplY3Qgd2hpY2ggaGFzIHRoZSBzYW1lIGZpZWxkcyBhcyB0aGVcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAge0BsaW5rIGdldH0gbWV0aG9kIHJldHVybiByZXN1bHQuXG4gICAqL1xuICBhc3luYyBnZXRPckZldGNoKGZpbGVQYXRoLCBmZXRjaGVyKSB7XG4gICAgbGV0IGNhY2hlUmVzdWx0ID0gYXdhaXQgdGhpcy5nZXQoZmlsZVBhdGgpO1xuICAgIGxldCBhbnlEZXBlbmRlbmNpZXNDaGFuZ2VkID0gYXdhaXQgdGhpcy5oYXZlQW55RGVwZW5kZW50RmlsZXNDaGFuZ2VkKGNhY2hlUmVzdWx0KTtcblxuICAgIGlmICgoY2FjaGVSZXN1bHQuY29kZSB8fCBjYWNoZVJlc3VsdC5iaW5hcnlEYXRhKSAmJiAhYW55RGVwZW5kZW5jaWVzQ2hhbmdlZCkge1xuICAgICAgcmV0dXJuIGNhY2hlUmVzdWx0O1xuICAgIH1cblxuICAgIGxldCByZXN1bHQgPSBhd2FpdCBmZXRjaGVyKGZpbGVQYXRoLCBjYWNoZVJlc3VsdC5oYXNoSW5mbykgfHwgeyBoYXNoSW5mbzogY2FjaGVSZXN1bHQuaGFzaEluZm8gfTtcblxuICAgIGlmIChyZXN1bHQubWltZVR5cGUgJiYgIWNhY2hlUmVzdWx0Lmhhc2hJbmZvLmlzSW5Ob2RlTW9kdWxlcykge1xuICAgICAgZChgQ2FjaGUgbWlzczogc2F2aW5nIG91dCBpbmZvIGZvciAke2ZpbGVQYXRofWApO1xuICAgICAgYXdhaXQgdGhpcy5zYXZlKGNhY2hlUmVzdWx0Lmhhc2hJbmZvLCByZXN1bHQuY29kZSB8fCByZXN1bHQuYmluYXJ5RGF0YSwgcmVzdWx0Lm1pbWVUeXBlLCByZXN1bHQuZGVwZW5kZW50RmlsZXMpO1xuXG4gICAgICBjb25zdCBtYXAgPSByZXN1bHQuc291cmNlTWFwcztcbiAgICAgIGlmIChtYXApIHtcbiAgICAgICAgZChgc291cmNlIG1hcCBmb3IgJHtmaWxlUGF0aH0gZm91bmQsIHNhdmluZyBpdCB0byAke3RoaXMuZ2V0U291cmNlTWFwUGF0aCgpfWApO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmVTb3VyY2VNYXAoY2FjaGVSZXN1bHQuaGFzaEluZm8sIGZpbGVQYXRoLCBtYXApO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJlc3VsdC5oYXNoSW5mbyA9IGNhY2hlUmVzdWx0Lmhhc2hJbmZvO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGUgQ2hlY2sgaWYgYW55IG9mIGEgZmlsZSdzIGRlcGVuZGVuY2llcyBoYXZlIGNoYW5nZWRcbiAgICovXG4gIGFzeW5jIGhhdmVBbnlEZXBlbmRlbnRGaWxlc0NoYW5nZWQoY2FjaGVSZXN1bHQpIHtcbiAgICBpZiAoIWNhY2hlUmVzdWx0LmNvZGUgfHwgIWNhY2hlUmVzdWx0LmRlcGVuZGVudEZpbGVzLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgZm9yIChsZXQgZGVwZW5kZW50RmlsZSBvZiBjYWNoZVJlc3VsdC5kZXBlbmRlbnRGaWxlcykge1xuICAgICAgbGV0IGhhc0ZpbGVDaGFuZ2VkID0gYXdhaXQgdGhpcy5maWxlQ2hhbmdlQ2FjaGUuaGFzRmlsZUNoYW5nZWQoZGVwZW5kZW50RmlsZSk7XG4gICAgICBpZiAoaGFzRmlsZUNoYW5nZWQpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIGxldCBkZXBlbmRlbnRGaWxlQ2FjaGVSZXN1bHQgPSBhd2FpdCB0aGlzLmdldChkZXBlbmRlbnRGaWxlKTtcbiAgICAgIGlmIChkZXBlbmRlbnRGaWxlQ2FjaGVSZXN1bHQuZGVwZW5kZW50RmlsZXMgJiYgZGVwZW5kZW50RmlsZUNhY2hlUmVzdWx0LmRlcGVuZGVudEZpbGVzLmxlbmd0aCkge1xuICAgICAgICBsZXQgYW55U3ViZGVwZW5kZW50RmlsZXNDaGFuZ2VkID0gYXdhaXQgdGhpcy5oYXZlQW55RGVwZW5kZW50RmlsZXNDaGFuZ2VkKGRlcGVuZGVudEZpbGVDYWNoZVJlc3VsdCk7XG4gICAgICAgIGlmIChhbnlTdWJkZXBlbmRlbnRGaWxlc0NoYW5nZWQpIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG5cbiAgZ2V0U3luYyhmaWxlUGF0aCkge1xuICAgIGQoYEZldGNoaW5nICR7ZmlsZVBhdGh9IGZyb20gY2FjaGVgKTtcbiAgICBsZXQgaGFzaEluZm8gPSB0aGlzLmZpbGVDaGFuZ2VDYWNoZS5nZXRIYXNoRm9yUGF0aFN5bmMocGF0aC5yZXNvbHZlKGZpbGVQYXRoKSk7XG5cbiAgICBsZXQgY29kZSA9IG51bGw7XG4gICAgbGV0IG1pbWVUeXBlID0gbnVsbDtcbiAgICBsZXQgYmluYXJ5RGF0YSA9IG51bGw7XG4gICAgbGV0IGRlcGVuZGVudEZpbGVzID0gbnVsbDtcblxuICAgIHRyeSB7XG4gICAgICBsZXQgY2FjaGVGaWxlID0gcGF0aC5qb2luKHRoaXMuZ2V0Q2FjaGVQYXRoKCksIGhhc2hJbmZvLmhhc2gpO1xuXG4gICAgICBsZXQgcmVzdWx0ID0gbnVsbDtcbiAgICAgIGlmIChoYXNoSW5mby5pc0ZpbGVCaW5hcnkpIHtcbiAgICAgICAgZChcIkZpbGUgaXMgYmluYXJ5LCByZWFkaW5nIG91dCBpbmZvXCIpO1xuICAgICAgICBsZXQgaW5mbyA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGNhY2hlRmlsZSArICcuaW5mbycpKTtcbiAgICAgICAgbWltZVR5cGUgPSBpbmZvLm1pbWVUeXBlO1xuICAgICAgICBkZXBlbmRlbnRGaWxlcyA9IGluZm8uZGVwZW5kZW50RmlsZXM7XG5cbiAgICAgICAgYmluYXJ5RGF0YSA9IGhhc2hJbmZvLmJpbmFyeURhdGE7XG4gICAgICAgIGlmICghYmluYXJ5RGF0YSkge1xuICAgICAgICAgIGJpbmFyeURhdGEgPSBmcy5yZWFkRmlsZVN5bmMoY2FjaGVGaWxlKTtcbiAgICAgICAgICBiaW5hcnlEYXRhID0gemxpYi5ndW56aXBTeW5jKGJpbmFyeURhdGEpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXQgYnVmID0gZnMucmVhZEZpbGVTeW5jKGNhY2hlRmlsZSk7XG4gICAgICAgIGxldCBzdHIgPSAoemxpYi5ndW56aXBTeW5jKGJ1ZikpLnRvU3RyaW5nKCd1dGY4Jyk7XG5cbiAgICAgICAgcmVzdWx0ID0gSlNPTi5wYXJzZShzdHIpO1xuICAgICAgICBjb2RlID0gcmVzdWx0LmNvZGU7XG4gICAgICAgIG1pbWVUeXBlID0gcmVzdWx0Lm1pbWVUeXBlO1xuICAgICAgICBkZXBlbmRlbnRGaWxlcyA9IHJlc3VsdC5kZXBlbmRlbnRGaWxlcztcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBkKGBGYWlsZWQgdG8gcmVhZCBjYWNoZSBmb3IgJHtmaWxlUGF0aH1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4geyBoYXNoSW5mbywgY29kZSwgbWltZVR5cGUsIGJpbmFyeURhdGEsIGRlcGVuZGVudEZpbGVzIH07XG4gIH1cblxuICBzYXZlU3luYyhoYXNoSW5mbywgY29kZU9yQmluYXJ5RGF0YSwgbWltZVR5cGUsIGRlcGVuZGVudEZpbGVzKSB7XG4gICAgbGV0IGJ1ZiA9IG51bGw7XG4gICAgbGV0IHRhcmdldCA9IHBhdGguam9pbih0aGlzLmdldENhY2hlUGF0aCgpLCBoYXNoSW5mby5oYXNoKTtcbiAgICBkKGBTYXZpbmcgdG8gJHt0YXJnZXR9YCk7XG5cbiAgICBpZiAoaGFzaEluZm8uaXNGaWxlQmluYXJ5KSB7XG4gICAgICBidWYgPSB6bGliLmd6aXBTeW5jKGNvZGVPckJpbmFyeURhdGEpO1xuICAgICAgZnMud3JpdGVGaWxlU3luYyh0YXJnZXQgKyAnLmluZm8nLCBKU09OLnN0cmluZ2lmeSh7bWltZVR5cGUsIGRlcGVuZGVudEZpbGVzfSksICd1dGY4Jyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJ1ZiA9IHpsaWIuZ3ppcFN5bmMobmV3IEJ1ZmZlcihKU09OLnN0cmluZ2lmeSh7Y29kZTogY29kZU9yQmluYXJ5RGF0YSwgbWltZVR5cGUsIGRlcGVuZGVudEZpbGVzfSkpKTtcbiAgICB9XG5cbiAgICBmcy53cml0ZUZpbGVTeW5jKHRhcmdldCwgYnVmKTtcbiAgfVxuXG4gIGdldE9yRmV0Y2hTeW5jKGZpbGVQYXRoLCBmZXRjaGVyKSB7XG4gICAgbGV0IGNhY2hlUmVzdWx0ID0gdGhpcy5nZXRTeW5jKGZpbGVQYXRoKTtcbiAgICBpZiAoY2FjaGVSZXN1bHQuY29kZSB8fCBjYWNoZVJlc3VsdC5iaW5hcnlEYXRhKSByZXR1cm4gY2FjaGVSZXN1bHQ7XG5cbiAgICBsZXQgcmVzdWx0ID0gZmV0Y2hlcihmaWxlUGF0aCwgY2FjaGVSZXN1bHQuaGFzaEluZm8pIHx8IHsgaGFzaEluZm86IGNhY2hlUmVzdWx0Lmhhc2hJbmZvIH07XG5cbiAgICBpZiAocmVzdWx0Lm1pbWVUeXBlICYmICFjYWNoZVJlc3VsdC5oYXNoSW5mby5pc0luTm9kZU1vZHVsZXMpIHtcbiAgICAgIGQoYENhY2hlIG1pc3M6IHNhdmluZyBvdXQgaW5mbyBmb3IgJHtmaWxlUGF0aH1gKTtcbiAgICAgIHRoaXMuc2F2ZVN5bmMoY2FjaGVSZXN1bHQuaGFzaEluZm8sIHJlc3VsdC5jb2RlIHx8IHJlc3VsdC5iaW5hcnlEYXRhLCByZXN1bHQubWltZVR5cGUsIHJlc3VsdC5kZXBlbmRlbnRGaWxlcyk7XG4gICAgfVxuXG4gICAgY29uc3QgbWFwID0gcmVzdWx0LnNvdXJjZU1hcHM7XG4gICAgaWYgKG1hcCkge1xuICAgICAgZChgc291cmNlIG1hcCBmb3IgJHtmaWxlUGF0aH0gZm91bmQsIHNhdmluZyBpdCB0byAke3RoaXMuZ2V0U291cmNlTWFwUGF0aCgpfWApO1xuICAgICAgdGhpcy5zYXZlU291cmNlTWFwU3luYyhjYWNoZVJlc3VsdC5oYXNoSW5mbywgZmlsZVBhdGgsIG1hcCk7XG4gICAgfVxuXG4gICAgcmVzdWx0Lmhhc2hJbmZvID0gY2FjaGVSZXN1bHQuaGFzaEluZm87XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGJ1aWxkU291cmNlTWFwVGFyZ2V0KGhhc2hJbmZvLCBmaWxlUGF0aCkge1xuICAgIGNvbnN0IGZpbGVOYW1lID0gcGF0aC5iYXNlbmFtZShmaWxlUGF0aCk7XG4gICAgY29uc3QgbWFwRmlsZU5hbWUgPSBmaWxlTmFtZS5yZXBsYWNlKHBhdGguZXh0bmFtZShmaWxlTmFtZSksICcuanMubWFwJyk7XG5cbiAgICBjb25zdCB0YXJnZXQgPSBwYXRoLmpvaW4odGhpcy5nZXRTb3VyY2VNYXBQYXRoKCksIG1hcEZpbGVOYW1lKTtcbiAgICBkKGBTb3VyY2VtYXAgdGFyZ2V0IGlzOiAke3RhcmdldH1gKTtcblxuICAgIHJldHVybiB0YXJnZXQ7XG4gIH1cblxuICAvKipcbiAgICogU2F2ZXMgc291cmNlbWFwIHN0cmluZyBpbnRvIGNhY2hlLCBvciBzcGVjaWZpZWQgc2VwYXJhdGUgZGlyXG4gICAqXG4gICAqIEBwYXJhbSAge09iamVjdH0gaGFzaEluZm8gIFRoZSBoYXNoIGluZm9ybWF0aW9uIHJldHVybmVkIGZyb20gZ2V0SGFzaEZvclBhdGhcbiAgICpcbiAgICogQHBhcmFtICB7c3RyaW5nfSBmaWxlUGF0aCBQYXRoIHRvIG9yaWdpbmFsIGZpbGUgdG8gY29uc3RydWN0IHNvdXJjZW1hcCBmaWxlIG5hbWVcblxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IHNvdXJjZU1hcCBTb3VyY2VtYXAgZGF0YSBhcyBzdHJpbmdcbiAgICpcbiAgICogQG1lbWJlck9mIENvbXBpbGVDYWNoZVxuICAgKi9cbiAgYXN5bmMgc2F2ZVNvdXJjZU1hcChoYXNoSW5mbywgZmlsZVBhdGgsIHNvdXJjZU1hcCkge1xuICAgIGNvbnN0IHRhcmdldCA9IHRoaXMuYnVpbGRTb3VyY2VNYXBUYXJnZXQoaGFzaEluZm8sIGZpbGVQYXRoKTtcbiAgICBhd2FpdCBwZnMud3JpdGVGaWxlKHRhcmdldCwgc291cmNlTWFwLCAndXRmLTgnKTtcbiAgfVxuXG4gIHNhdmVTb3VyY2VNYXBTeW5jKGhhc2hJbmZvLCBmaWxlUGF0aCwgc291cmNlTWFwKSB7XG4gICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5idWlsZFNvdXJjZU1hcFRhcmdldChoYXNoSW5mbywgZmlsZVBhdGgpO1xuICAgIGZzLndyaXRlRmlsZVN5bmModGFyZ2V0LCBzb3VyY2VNYXAsICd1dGYtOCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBnZXRDYWNoZVBhdGgoKSB7XG4gICAgLy8gTkI6IFRoaXMgaXMgYW4gZXZpbCBoYWNrIHNvIHRoYXQgY3JlYXRlRnJvbUNvbXBpbGVyIGNhbiBzdG9tcCBpdFxuICAgIC8vIGF0IHdpbGxcbiAgICByZXR1cm4gdGhpcy5jYWNoZVBhdGg7XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGdldFNvdXJjZU1hcFBhdGgoKSB7XG4gICAgcmV0dXJuIHRoaXMuc291cmNlTWFwUGF0aDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHdoZXRoZXIgYSBmaWxlIHNob3VsZCBub3QgYmUgY29tcGlsZWQuIE5vdGUgdGhhdCB0aGlzIGRvZXNuJ3RcbiAgICogbmVjZXNzYXJpbHkgbWVhbiBpdCB3b24ndCBlbmQgdXAgaW4gdGhlIGNhY2hlLCBvbmx5IHRoYXQgaXRzIGNvbnRlbnRzIGFyZVxuICAgKiBzYXZlZCB2ZXJiYXRpbSBpbnN0ZWFkIG9mIHRyeWluZyB0byBmaW5kIGFuIGFwcHJvcHJpYXRlIGNvbXBpbGVyLlxuICAgKlxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGhhc2hJbmZvICBUaGUgaGFzaCBpbmZvcm1hdGlvbiByZXR1cm5lZCBmcm9tIGdldEhhc2hGb3JQYXRoXG4gICAqXG4gICAqIEByZXR1cm4ge2Jvb2xlYW59ICBUcnVlIGlmIGEgZmlsZSBzaG91bGQgYmUgaWdub3JlZFxuICAgKi9cbiAgc3RhdGljIHNob3VsZFBhc3N0aHJvdWdoKGhhc2hJbmZvKSB7XG4gICAgcmV0dXJuIGhhc2hJbmZvLmlzTWluaWZpZWQgfHwgaGFzaEluZm8uaXNJbk5vZGVNb2R1bGVzIHx8IGhhc2hJbmZvLmhhc1NvdXJjZU1hcCB8fCBoYXNoSW5mby5pc0ZpbGVCaW5hcnk7XG4gIH1cbn1cbiJdfQ==