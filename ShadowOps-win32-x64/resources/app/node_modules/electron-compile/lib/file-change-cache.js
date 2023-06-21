'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _zlib = require('zlib');

var _zlib2 = _interopRequireDefault(_zlib);

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _promise = require('./promise');

var _sanitizePaths = require('./sanitize-paths');

var _sanitizePaths2 = _interopRequireDefault(_sanitizePaths);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const d = require('debug')('electron-compile:file-change-cache');

/**
 * This class caches information about files and determines whether they have
 * changed contents or not. Most importantly, this class caches the hash of seen
 * files so that at development time, we don't have to recalculate them constantly.
 *
 * This class is also the core of how electron-compile runs quickly in production
 * mode - after precompilation, the cache is serialized along with the rest of the
 * data in {@link CompilerHost}, so that when we load the app in production mode,
 * we don't end up calculating hashes of file content at all, only using the contents
 * of this cache.
 */
class FileChangedCache {
  constructor(appRoot) {
    let failOnCacheMiss = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

    this.appRoot = (0, _sanitizePaths2.default)(appRoot);

    this.failOnCacheMiss = failOnCacheMiss;
    this.changeCache = {};
  }

  static removePrefix(needle, haystack) {
    let idx = haystack.toLowerCase().indexOf(needle.toLowerCase());
    if (idx < 0) return haystack;

    return haystack.substring(idx + needle.length);
  }

  /**
   * Allows you to create a FileChangedCache from serialized data saved from
   * {@link getSavedData}.
   *
   * @param  {Object} data  Saved data from getSavedData.
   *
   * @param  {string} appRoot  The top-level directory for your application (i.e.
   *                           the one which has your package.json).
   *
   * @param  {boolean} failOnCacheMiss (optional)  If True, cache misses will throw.
   *
   * @return {FileChangedCache}
   */
  static loadFromData(data, appRoot) {
    let failOnCacheMiss = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

    let ret = new FileChangedCache(appRoot, failOnCacheMiss);
    ret.changeCache = data.changeCache;
    ret.originalAppRoot = data.appRoot;

    return ret;
  }

  /**
   * Allows you to create a FileChangedCache from serialized data saved from
   * {@link save}.
   *
   * @param  {string} file  Saved data from save.
   *
   * @param  {string} appRoot  The top-level directory for your application (i.e.
   *                           the one which has your package.json).
   *
   * @param  {boolean} failOnCacheMiss (optional)  If True, cache misses will throw.
   *
   * @return {Promise<FileChangedCache>}
   */
  static loadFromFile(file, appRoot) {
    let failOnCacheMiss = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
    return _asyncToGenerator(function* () {
      d(`Loading canned FileChangedCache from ${file}`);

      let buf = yield _promise.pfs.readFile(file);
      return FileChangedCache.loadFromData(JSON.parse((yield _promise.pzlib.gunzip(buf))), appRoot, failOnCacheMiss);
    })();
  }

  /**
   * Returns information about a given file, including its hash. This method is
   * the main method for this cache.
   *
   * @param  {string} absoluteFilePath  The path to a file to retrieve info on.
   *
   * @return {Promise<Object>}
   *
   * @property {string} hash  The SHA1 hash of the file
   * @property {boolean} isMinified  True if the file is minified
   * @property {boolean} isInNodeModules  True if the file is in a library directory
   * @property {boolean} hasSourceMap  True if the file has a source map
   * @property {boolean} isFileBinary  True if the file is not a text file
   * @property {Buffer} binaryData (optional)  The buffer that was read if the file
   *                                           was binary and there was a cache miss.
   * @property {string} code (optional)  The string that was read if the file
   *                                     was text and there was a cache miss
   */
  getHashForPath(absoluteFilePath) {
    var _this = this;

    return _asyncToGenerator(function* () {
      var _getCacheEntryForPath = _this.getCacheEntryForPath(absoluteFilePath);

      let cacheEntry = _getCacheEntryForPath.cacheEntry,
          cacheKey = _getCacheEntryForPath.cacheKey;


      if (_this.failOnCacheMiss) {
        return cacheEntry.info;
      }

      var _ref = yield _this.getInfoForCacheEntry(absoluteFilePath);

      let ctime = _ref.ctime,
          size = _ref.size;


      if (cacheEntry) {
        let fileHasChanged = yield _this.hasFileChanged(absoluteFilePath, cacheEntry, { ctime, size });

        if (!fileHasChanged) {
          return cacheEntry.info;
        }

        d(`Invalidating cache entry: ${cacheEntry.ctime} === ${ctime} && ${cacheEntry.size} === ${size}`);
        delete _this.changeCache.cacheEntry;
      }

      var _ref2 = yield _this.calculateHashForFile(absoluteFilePath);

      let digest = _ref2.digest,
          sourceCode = _ref2.sourceCode,
          binaryData = _ref2.binaryData;


      let info = {
        hash: digest,
        isMinified: FileChangedCache.contentsAreMinified(sourceCode || ''),
        isInNodeModules: FileChangedCache.isInNodeModules(absoluteFilePath),
        hasSourceMap: FileChangedCache.hasSourceMap(sourceCode || ''),
        isFileBinary: !!binaryData
      };

      _this.changeCache[cacheKey] = { ctime, size, info };
      d(`Cache entry for ${cacheKey}: ${JSON.stringify(_this.changeCache[cacheKey])}`);

      if (binaryData) {
        return Object.assign({ binaryData }, info);
      } else {
        return Object.assign({ sourceCode }, info);
      }
    })();
  }

  getInfoForCacheEntry(absoluteFilePath) {
    return _asyncToGenerator(function* () {
      let stat = yield _promise.pfs.stat(absoluteFilePath);
      if (!stat || !stat.isFile()) throw new Error(`Can't stat ${absoluteFilePath}`);

      return {
        stat,
        ctime: stat.ctime.getTime(),
        size: stat.size
      };
    })();
  }

  /**
   * Gets the cached data for a file path, if it exists.
   *
   * @param  {string} absoluteFilePath  The path to a file to retrieve info on.
   *
   * @return {Object}
   */
  getCacheEntryForPath(absoluteFilePath) {
    let cacheKey = (0, _sanitizePaths2.default)(absoluteFilePath);
    if (this.appRoot) {
      cacheKey = cacheKey.replace(this.appRoot, '');
    }

    // NB: We do this because x-require will include an absolute path from the
    // original built app and we need to still grok it
    if (this.originalAppRoot) {
      cacheKey = cacheKey.replace(this.originalAppRoot, '');
    }

    let cacheEntry = this.changeCache[cacheKey];

    if (this.failOnCacheMiss) {
      if (!cacheEntry) {
        d(`Tried to read file cache entry for ${absoluteFilePath}`);
        d(`cacheKey: ${cacheKey}, appRoot: ${this.appRoot}, originalAppRoot: ${this.originalAppRoot}`);
        throw new Error(`Asked for ${absoluteFilePath} but it was not precompiled!`);
      }
    }

    return { cacheEntry, cacheKey };
  }

  /**
   * Checks the file cache to see if a file has changed.
   *
   * @param  {string} absoluteFilePath  The path to a file to retrieve info on.
   * @param  {Object} cacheEntry  Cache data from {@link getCacheEntryForPath}
   *
   * @return {boolean}
   */
  hasFileChanged(absoluteFilePath) {
    var _this2 = this;

    let cacheEntry = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    let fileHashInfo = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    return _asyncToGenerator(function* () {
      cacheEntry = cacheEntry || _this2.getCacheEntryForPath(absoluteFilePath).cacheEntry;
      fileHashInfo = fileHashInfo || (yield _this2.getInfoForCacheEntry(absoluteFilePath));

      if (cacheEntry) {
        return !(cacheEntry.ctime >= fileHashInfo.ctime && cacheEntry.size === fileHashInfo.size);
      }

      return false;
    })();
  }

  /**
   * Returns data that can passed to {@link loadFromData} to rehydrate this cache.
   *
   * @return {Object}
   */
  getSavedData() {
    return { changeCache: this.changeCache, appRoot: this.appRoot };
  }

  /**
   * Serializes this object's data to a file.
   *
   * @param {string} filePath  The path to save data to.
   *
   * @return {Promise} Completion.
   */
  save(filePath) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      let toSave = _this3.getSavedData();

      let buf = yield _promise.pzlib.gzip(new Buffer(JSON.stringify(toSave)));
      yield _promise.pfs.writeFile(filePath, buf);
    })();
  }

  calculateHashForFile(absoluteFilePath) {
    return _asyncToGenerator(function* () {
      let buf = yield _promise.pfs.readFile(absoluteFilePath);
      let encoding = FileChangedCache.detectFileEncoding(buf);

      if (!encoding) {
        let digest = _crypto2.default.createHash('sha1').update(buf).digest('hex');
        return { sourceCode: null, digest, binaryData: buf };
      }

      let sourceCode = yield _promise.pfs.readFile(absoluteFilePath, encoding);
      let digest = _crypto2.default.createHash('sha1').update(sourceCode, 'utf8').digest('hex');

      return { sourceCode, digest, binaryData: null };
    })();
  }

  getHashForPathSync(absoluteFilePath) {
    let cacheKey = (0, _sanitizePaths2.default)(absoluteFilePath);

    if (this.appRoot) {
      cacheKey = FileChangedCache.removePrefix(this.appRoot, cacheKey);
    }

    // NB: We do this because x-require will include an absolute path from the
    // original built app and we need to still grok it
    if (this.originalAppRoot) {
      cacheKey = FileChangedCache.removePrefix(this.originalAppRoot, cacheKey);
    }

    let cacheEntry = this.changeCache[cacheKey];

    if (this.failOnCacheMiss) {
      if (!cacheEntry) {
        d(`Tried to read file cache entry for ${absoluteFilePath}`);
        d(`cacheKey: ${cacheKey}, appRoot: ${this.appRoot}, originalAppRoot: ${this.originalAppRoot}`);
        throw new Error(`Asked for ${absoluteFilePath} but it was not precompiled!`);
      }

      return cacheEntry.info;
    }

    let stat = _fs2.default.statSync(absoluteFilePath);
    let ctime = stat.ctime.getTime();
    let size = stat.size;
    if (!stat || !stat.isFile()) throw new Error(`Can't stat ${absoluteFilePath}`);

    if (cacheEntry) {
      if (cacheEntry.ctime >= ctime && cacheEntry.size === size) {
        return cacheEntry.info;
      }

      d(`Invalidating cache entry: ${cacheEntry.ctime} === ${ctime} && ${cacheEntry.size} === ${size}`);
      delete this.changeCache.cacheEntry;
    }

    var _calculateHashForFile = this.calculateHashForFileSync(absoluteFilePath);

    let digest = _calculateHashForFile.digest,
        sourceCode = _calculateHashForFile.sourceCode,
        binaryData = _calculateHashForFile.binaryData;


    let info = {
      hash: digest,
      isMinified: FileChangedCache.contentsAreMinified(sourceCode || ''),
      isInNodeModules: FileChangedCache.isInNodeModules(absoluteFilePath),
      hasSourceMap: FileChangedCache.hasSourceMap(sourceCode || ''),
      isFileBinary: !!binaryData
    };

    this.changeCache[cacheKey] = { ctime, size, info };
    d(`Cache entry for ${cacheKey}: ${JSON.stringify(this.changeCache[cacheKey])}`);

    if (binaryData) {
      return Object.assign({ binaryData }, info);
    } else {
      return Object.assign({ sourceCode }, info);
    }
  }

  saveSync(filePath) {
    let toSave = this.getSavedData();

    let buf = _zlib2.default.gzipSync(new Buffer(JSON.stringify(toSave)));
    _fs2.default.writeFileSync(filePath, buf);
  }

  calculateHashForFileSync(absoluteFilePath) {
    let buf = _fs2.default.readFileSync(absoluteFilePath);
    let encoding = FileChangedCache.detectFileEncoding(buf);

    if (!encoding) {
      let digest = _crypto2.default.createHash('sha1').update(buf).digest('hex');
      return { sourceCode: null, digest, binaryData: buf };
    }

    let sourceCode = _fs2.default.readFileSync(absoluteFilePath, encoding);
    let digest = _crypto2.default.createHash('sha1').update(sourceCode, 'utf8').digest('hex');

    return { sourceCode, digest, binaryData: null };
  }

  /**
   * Determines via some statistics whether a file is likely to be minified.
   *
   * @private
   */
  static contentsAreMinified(source) {
    let length = source.length;
    if (length > 1024) length = 1024;

    let newlineCount = 0;

    // Roll through the characters and determine the average line length
    for (let i = 0; i < source.length; i++) {
      if (source[i] === '\n') newlineCount++;
    }

    // No Newlines? Any file other than a super small one is minified
    if (newlineCount === 0) {
      return length > 80;
    }

    let avgLineLength = length / newlineCount;
    return avgLineLength > 80;
  }

  /**
   * Determines whether a path is in node_modules or the Electron init code
   *
   * @private
   */
  static isInNodeModules(filePath) {
    return !!(filePath.match(/(node_modules|bower_components)[\\\/]/i) || filePath.match(/(atom|electron)\.asar/));
  }

  /**
   * Returns whether a file has an inline source map
   *
   * @private
   */
  static hasSourceMap(sourceCode) {
    const trimmed = sourceCode.trim();
    return trimmed.lastIndexOf('//# sourceMap') > trimmed.lastIndexOf('\n');
  }

  /**
   * Determines the encoding of a file from the two most common encodings by trying
   * to decode it then looking for encoding errors
   *
   * @private
   */
  static detectFileEncoding(buffer) {
    if (buffer.length < 1) return false;
    let buf = buffer.length < 4096 ? buffer : buffer.slice(0, 4096);

    const encodings = ['utf8', 'utf16le'];

    let encoding;
    if (buffer.length <= 128) {
      encoding = encodings.find(x => Buffer.compare(new Buffer(buffer.toString(), x), buffer) === 0);
    } else {
      encoding = encodings.find(x => !FileChangedCache.containsControlCharacters(buf.toString(x)));
    }

    return encoding;
  }

  /**
   * Determines whether a string is likely to be poorly encoded by looking for
   * control characters above a certain threshold
   *
   * @private
   */
  static containsControlCharacters(str) {
    let controlCount = 0;
    let spaceCount = 0;
    let threshold = 2;
    if (str.length > 64) threshold = 4;
    if (str.length > 512) threshold = 8;

    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c === 65536 || c < 8) controlCount++;
      if (c > 14 && c < 32) controlCount++;
      if (c === 32) spaceCount++;

      if (controlCount > threshold) return true;
    }

    if (spaceCount < threshold) return true;

    if (controlCount === 0) return false;
    return controlCount / str.length < 0.02;
  }
}
exports.default = FileChangedCache;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9maWxlLWNoYW5nZS1jYWNoZS5qcyJdLCJuYW1lcyI6WyJkIiwicmVxdWlyZSIsIkZpbGVDaGFuZ2VkQ2FjaGUiLCJjb25zdHJ1Y3RvciIsImFwcFJvb3QiLCJmYWlsT25DYWNoZU1pc3MiLCJjaGFuZ2VDYWNoZSIsInJlbW92ZVByZWZpeCIsIm5lZWRsZSIsImhheXN0YWNrIiwiaWR4IiwidG9Mb3dlckNhc2UiLCJpbmRleE9mIiwic3Vic3RyaW5nIiwibGVuZ3RoIiwibG9hZEZyb21EYXRhIiwiZGF0YSIsInJldCIsIm9yaWdpbmFsQXBwUm9vdCIsImxvYWRGcm9tRmlsZSIsImZpbGUiLCJidWYiLCJwZnMiLCJyZWFkRmlsZSIsIkpTT04iLCJwYXJzZSIsInB6bGliIiwiZ3VuemlwIiwiZ2V0SGFzaEZvclBhdGgiLCJhYnNvbHV0ZUZpbGVQYXRoIiwiZ2V0Q2FjaGVFbnRyeUZvclBhdGgiLCJjYWNoZUVudHJ5IiwiY2FjaGVLZXkiLCJpbmZvIiwiZ2V0SW5mb0ZvckNhY2hlRW50cnkiLCJjdGltZSIsInNpemUiLCJmaWxlSGFzQ2hhbmdlZCIsImhhc0ZpbGVDaGFuZ2VkIiwiY2FsY3VsYXRlSGFzaEZvckZpbGUiLCJkaWdlc3QiLCJzb3VyY2VDb2RlIiwiYmluYXJ5RGF0YSIsImhhc2giLCJpc01pbmlmaWVkIiwiY29udGVudHNBcmVNaW5pZmllZCIsImlzSW5Ob2RlTW9kdWxlcyIsImhhc1NvdXJjZU1hcCIsImlzRmlsZUJpbmFyeSIsInN0cmluZ2lmeSIsIk9iamVjdCIsImFzc2lnbiIsInN0YXQiLCJpc0ZpbGUiLCJFcnJvciIsImdldFRpbWUiLCJyZXBsYWNlIiwiZmlsZUhhc2hJbmZvIiwiZ2V0U2F2ZWREYXRhIiwic2F2ZSIsImZpbGVQYXRoIiwidG9TYXZlIiwiZ3ppcCIsIkJ1ZmZlciIsIndyaXRlRmlsZSIsImVuY29kaW5nIiwiZGV0ZWN0RmlsZUVuY29kaW5nIiwiY3J5cHRvIiwiY3JlYXRlSGFzaCIsInVwZGF0ZSIsImdldEhhc2hGb3JQYXRoU3luYyIsImZzIiwic3RhdFN5bmMiLCJjYWxjdWxhdGVIYXNoRm9yRmlsZVN5bmMiLCJzYXZlU3luYyIsInpsaWIiLCJnemlwU3luYyIsIndyaXRlRmlsZVN5bmMiLCJyZWFkRmlsZVN5bmMiLCJzb3VyY2UiLCJuZXdsaW5lQ291bnQiLCJpIiwiYXZnTGluZUxlbmd0aCIsIm1hdGNoIiwidHJpbW1lZCIsInRyaW0iLCJsYXN0SW5kZXhPZiIsImJ1ZmZlciIsInNsaWNlIiwiZW5jb2RpbmdzIiwiZmluZCIsIngiLCJjb21wYXJlIiwidG9TdHJpbmciLCJjb250YWluc0NvbnRyb2xDaGFyYWN0ZXJzIiwic3RyIiwiY29udHJvbENvdW50Iiwic3BhY2VDb3VudCIsInRocmVzaG9sZCIsImMiLCJjaGFyQ29kZUF0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7Ozs7Ozs7QUFFQSxNQUFNQSxJQUFJQyxRQUFRLE9BQVIsRUFBaUIsb0NBQWpCLENBQVY7O0FBRUE7Ozs7Ozs7Ozs7O0FBV2UsTUFBTUMsZ0JBQU4sQ0FBdUI7QUFDcENDLGNBQVlDLE9BQVosRUFBNEM7QUFBQSxRQUF2QkMsZUFBdUIsdUVBQVAsS0FBTzs7QUFDMUMsU0FBS0QsT0FBTCxHQUFlLDZCQUFpQkEsT0FBakIsQ0FBZjs7QUFFQSxTQUFLQyxlQUFMLEdBQXVCQSxlQUF2QjtBQUNBLFNBQUtDLFdBQUwsR0FBbUIsRUFBbkI7QUFDRDs7QUFFRCxTQUFPQyxZQUFQLENBQW9CQyxNQUFwQixFQUE0QkMsUUFBNUIsRUFBc0M7QUFDcEMsUUFBSUMsTUFBTUQsU0FBU0UsV0FBVCxHQUF1QkMsT0FBdkIsQ0FBK0JKLE9BQU9HLFdBQVAsRUFBL0IsQ0FBVjtBQUNBLFFBQUlELE1BQU0sQ0FBVixFQUFhLE9BQU9ELFFBQVA7O0FBRWIsV0FBT0EsU0FBU0ksU0FBVCxDQUFtQkgsTUFBTUYsT0FBT00sTUFBaEMsQ0FBUDtBQUNEOztBQUVEOzs7Ozs7Ozs7Ozs7O0FBYUEsU0FBT0Ms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QWEsRUFBakIsRUFBcUJvRixZQUFZLENBQVo7QUFDckIsUUFBSUgsSUFBSWpGLE1BQUosR0FBYSxHQUFqQixFQUFzQm9GLFlBQVksQ0FBWjs7QUFFdEIsU0FBSyxJQUFJakIsSUFBRSxDQUFYLEVBQWNBLElBQUljLElBQUlqRixNQUF0QixFQUE4Qm1FLEdBQTlCLEVBQW1DO0FBQ2pDLFVBQUlrQixJQUFJSixJQUFJSyxVQUFKLENBQWVuQixDQUFmLENBQVI7QUFDQSxVQUFJa0IsTUFBTSxLQUFOLElBQWVBLElBQUksQ0FBdkIsRUFBMEJIO0FBQzFCLFVBQUlHLElBQUksRUFBSixJQUFVQSxJQUFJLEVBQWxCLEVBQXNCSDtBQUN0QixVQUFJRyxNQUFNLEVBQVYsRUFBY0Y7O0FBRWQsVUFBSUQsZUFBZUUsU0FBbkIsRUFBOEIsT0FBTyxJQUFQO0FBQy9COztBQUVELFFBQUlELGFBQWFDLFNBQWpCLEVBQTRCLE9BQU8sSUFBUDs7QUFFNUIsUUFBSUYsaUJBQWlCLENBQXJCLEVBQXdCLE9BQU8sS0FBUDtBQUN4QixXQUFRQSxlQUFlRCxJQUFJakYsTUFBcEIsR0FBOEIsSUFBckM7QUFDRDtBQTFZbUM7a0JBQWpCWixnQiIsImZpbGUiOiJmaWxlLWNoYW5nZS1jYWNoZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgemxpYiBmcm9tICd6bGliJztcbmltcG9ydCBjcnlwdG8gZnJvbSAnY3J5cHRvJztcbmltcG9ydCB7cGZzLCBwemxpYn0gZnJvbSAnLi9wcm9taXNlJztcbmltcG9ydCBzYW5pdGl6ZUZpbGVQYXRoIGZyb20gJy4vc2FuaXRpemUtcGF0aHMnO1xuXG5jb25zdCBkID0gcmVxdWlyZSgnZGVidWcnKSgnZWxlY3Ryb24tY29tcGlsZTpmaWxlLWNoYW5nZS1jYWNoZScpO1xuXG4vKipcbiAqIFRoaXMgY2xhc3MgY2FjaGVzIGluZm9ybWF0aW9uIGFib3V0IGZpbGVzIGFuZCBkZXRlcm1pbmVzIHdoZXRoZXIgdGhleSBoYXZlXG4gKiBjaGFuZ2VkIGNvbnRlbnRzIG9yIG5vdC4gTW9zdCBpbXBvcnRhbnRseSwgdGhpcyBjbGFzcyBjYWNoZXMgdGhlIGhhc2ggb2Ygc2VlblxuICogZmlsZXMgc28gdGhhdCBhdCBkZXZlbG9wbWVudCB0aW1lLCB3ZSBkb24ndCBoYXZlIHRvIHJlY2FsY3VsYXRlIHRoZW0gY29uc3RhbnRseS5cbiAqXG4gKiBUaGlzIGNsYXNzIGlzIGFsc28gdGhlIGNvcmUgb2YgaG93IGVsZWN0cm9uLWNvbXBpbGUgcnVucyBxdWlja2x5IGluIHByb2R1Y3Rpb25cbiAqIG1vZGUgLSBhZnRlciBwcmVjb21waWxhdGlvbiwgdGhlIGNhY2hlIGlzIHNlcmlhbGl6ZWQgYWxvbmcgd2l0aCB0aGUgcmVzdCBvZiB0aGVcbiAqIGRhdGEgaW4ge0BsaW5rIENvbXBpbGVySG9zdH0sIHNvIHRoYXQgd2hlbiB3ZSBsb2FkIHRoZSBhcHAgaW4gcHJvZHVjdGlvbiBtb2RlLFxuICogd2UgZG9uJ3QgZW5kIHVwIGNhbGN1bGF0aW5nIGhhc2hlcyBvZiBmaWxlIGNvbnRlbnQgYXQgYWxsLCBvbmx5IHVzaW5nIHRoZSBjb250ZW50c1xuICogb2YgdGhpcyBjYWNoZS5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRmlsZUNoYW5nZWRDYWNoZSB7XG4gIGNvbnN0cnVjdG9yKGFwcFJvb3QsIGZhaWxPbkNhY2hlTWlzcz1mYWxzZSkge1xuICAgIHRoaXMuYXBwUm9vdCA9IHNhbml0aXplRmlsZVBhdGgoYXBwUm9vdCk7XG5cbiAgICB0aGlzLmZhaWxPbkNhY2hlTWlzcyA9IGZhaWxPbkNhY2hlTWlzcztcbiAgICB0aGlzLmNoYW5nZUNhY2hlID0ge307XG4gIH1cblxuICBzdGF0aWMgcmVtb3ZlUHJlZml4KG5lZWRsZSwgaGF5c3RhY2spIHtcbiAgICBsZXQgaWR4ID0gaGF5c3RhY2sudG9Mb3dlckNhc2UoKS5pbmRleE9mKG5lZWRsZS50b0xvd2VyQ2FzZSgpKTtcbiAgICBpZiAoaWR4IDwgMCkgcmV0dXJuIGhheXN0YWNrO1xuXG4gICAgcmV0dXJuIGhheXN0YWNrLnN1YnN0cmluZyhpZHggKyBuZWVkbGUubGVuZ3RoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBbGxvd3MgeW91IHRvIGNyZWF0ZSBhIEZpbGVDaGFuZ2VkQ2FjaGUgZnJvbSBzZXJpYWxpemVkIGRhdGEgc2F2ZWQgZnJvbVxuICAgKiB7QGxpbmsgZ2V0U2F2ZWREYXRhfS5cbiAgICpcbiAgICogQHBhcmFtICB7T2JqZWN0fSBkYXRhICBTYXZlZCBkYXRhIGZyb20gZ2V0U2F2ZWREYXRhLlxuICAgKlxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IGFwcFJvb3QgIFRoZSB0b3AtbGV2ZWwgZGlyZWN0b3J5IGZvciB5b3VyIGFwcGxpY2F0aW9uIChpLmUuXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlIG9uZSB3aGljaCBoYXMgeW91ciBwYWNrYWdlLmpzb24pLlxuICAgKlxuICAgKiBAcGFyYW0gIHtib29sZWFufSBmYWlsT25DYWNoZU1pc3MgKG9wdGlvbmFsKSAgSWYgVHJ1ZSwgY2FjaGUgbWlzc2VzIHdpbGwgdGhyb3cuXG4gICAqXG4gICAqIEByZXR1cm4ge0ZpbGVDaGFuZ2VkQ2FjaGV9XG4gICAqL1xuICBzdGF0aWMgbG9hZEZyb21EYXRhKGRhdGEsIGFwcFJvb3QsIGZhaWxPbkNhY2hlTWlzcz10cnVlKSB7XG4gICAgbGV0IHJldCA9IG5ldyBGaWxlQ2hhbmdlZENhY2hlKGFwcFJvb3QsIGZhaWxPbkNhY2hlTWlzcyk7XG4gICAgcmV0LmNoYW5nZUNhY2hlID0gZGF0YS5jaGFuZ2VDYWNoZTtcbiAgICByZXQub3JpZ2luYWxBcHBSb290ID0gZGF0YS5hcHBSb290O1xuXG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIEFsbG93cyB5b3UgdG8gY3JlYXRlIGEgRmlsZUNoYW5nZWRDYWNoZSBmcm9tIHNlcmlhbGl6ZWQgZGF0YSBzYXZlZCBmcm9tXG4gICAqIHtAbGluayBzYXZlfS5cbiAgICpcbiAgICogQHBhcmFtICB7c3RyaW5nfSBmaWxlICBTYXZlZCBkYXRhIGZyb20gc2F2ZS5cbiAgICpcbiAgICogQHBhcmFtICB7c3RyaW5nfSBhcHBSb290ICBUaGUgdG9wLWxldmVsIGRpcmVjdG9yeSBmb3IgeW91ciBhcHBsaWNhdGlvbiAoaS5lLlxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZSBvbmUgd2hpY2ggaGFzIHlvdXIgcGFja2FnZS5qc29uKS5cbiAgICpcbiAgICogQHBhcmFtICB7Ym9vbGVhbn0gZmFpbE9uQ2FjaGVNaXNzIChvcHRpb25hbCkgIElmIFRydWUsIGNhY2hlIG1pc3NlcyB3aWxsIHRocm93LlxuICAgKlxuICAgKiBAcmV0dXJuIHtQcm9taXNlPEZpbGVDaGFuZ2VkQ2FjaGU+fVxuICAgKi9cbiAgc3RhdGljIGFzeW5jIGxvYWRGcm9tRmlsZShmaWxlLCBhcHBSb290LCBmYWlsT25DYWNoZU1pc3M9dHJ1ZSkge1xuICAgIGQoYExvYWRpbmcgY2FubmVkIEZpbGVDaGFuZ2VkQ2FjaGUgZnJvbSAke2ZpbGV9YCk7XG5cbiAgICBsZXQgYnVmID0gYXdhaXQgcGZzLnJlYWRGaWxlKGZpbGUpO1xuICAgIHJldHVybiBGaWxlQ2hhbmdlZENhY2hlLmxvYWRGcm9tRGF0YShKU09OLnBhcnNlKGF3YWl0IHB6bGliLmd1bnppcChidWYpKSwgYXBwUm9vdCwgZmFpbE9uQ2FjaGVNaXNzKTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIFJldHVybnMgaW5mb3JtYXRpb24gYWJvdXQgYSBnaXZlbiBmaWxlLCBpbmNsdWRpbmcgaXRzIGhhc2guIFRoaXMgbWV0aG9kIGlzXG4gICAqIHRoZSBtYWluIG1ldGhvZCBmb3IgdGhpcyBjYWNoZS5cbiAgICpcbiAgICogQHBhcmFtICB7c3RyaW5nfSBhYnNvbHV0ZUZpbGVQYXRoICBUaGUgcGF0aCB0byBhIGZpbGUgdG8gcmV0cmlldmUgaW5mbyBvbi5cbiAgICpcbiAgICogQHJldHVybiB7UHJvbWlzZTxPYmplY3Q+fVxuICAgKlxuICAgKiBAcHJvcGVydHkge3N0cmluZ30gaGFzaCAgVGhlIFNIQTEgaGFzaCBvZiB0aGUgZmlsZVxuICAgKiBAcHJvcGVydHkge2Jvb2xlYW59IGlzTWluaWZpZWQgIFRydWUgaWYgdGhlIGZpbGUgaXMgbWluaWZpZWRcbiAgICogQHByb3BlcnR5IHtib29sZWFufSBpc0luTm9kZU1vZHVsZXMgIFRydWUgaWYgdGhlIGZpbGUgaXMgaW4gYSBsaWJyYXJ5IGRpcmVjdG9yeVxuICAgKiBAcHJvcGVydHkge2Jvb2xlYW59IGhhc1NvdXJjZU1hcCAgVHJ1ZSBpZiB0aGUgZmlsZSBoYXMgYSBzb3VyY2UgbWFwXG4gICAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gaXNGaWxlQmluYXJ5ICBUcnVlIGlmIHRoZSBmaWxlIGlzIG5vdCBhIHRleHQgZmlsZVxuICAgKiBAcHJvcGVydHkge0J1ZmZlcn0gYmluYXJ5RGF0YSAob3B0aW9uYWwpICBUaGUgYnVmZmVyIHRoYXQgd2FzIHJlYWQgaWYgdGhlIGZpbGVcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2FzIGJpbmFyeSBhbmQgdGhlcmUgd2FzIGEgY2FjaGUgbWlzcy5cbiAgICogQHByb3BlcnR5IHtzdHJpbmd9IGNvZGUgKG9wdGlvbmFsKSAgVGhlIHN0cmluZyB0aGF0IHdhcyByZWFkIGlmIHRoZSBmaWxlXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdhcyB0ZXh0IGFuZCB0aGVyZSB3YXMgYSBjYWNoZSBtaXNzXG4gICAqL1xuICBhc3luYyBnZXRIYXNoRm9yUGF0aChhYnNvbHV0ZUZpbGVQYXRoKSB7XG4gICAgbGV0IHtjYWNoZUVudHJ5LCBjYWNoZUtleX0gPSB0aGlzLmdldENhY2hlRW50cnlGb3JQYXRoKGFic29sdXRlRmlsZVBhdGgpO1xuXG4gICAgaWYgKHRoaXMuZmFpbE9uQ2FjaGVNaXNzKSB7XG4gICAgICByZXR1cm4gY2FjaGVFbnRyeS5pbmZvO1xuICAgIH1cblxuICAgIGxldCB7Y3RpbWUsIHNpemV9ID0gYXdhaXQgdGhpcy5nZXRJbmZvRm9yQ2FjaGVFbnRyeShhYnNvbHV0ZUZpbGVQYXRoKTtcblxuICAgIGlmIChjYWNoZUVudHJ5KSB7XG4gICAgICBsZXQgZmlsZUhhc0NoYW5nZWQgPSBhd2FpdCB0aGlzLmhhc0ZpbGVDaGFuZ2VkKGFic29sdXRlRmlsZVBhdGgsIGNhY2hlRW50cnksIHtjdGltZSwgc2l6ZX0pO1xuXG4gICAgICBpZiAoIWZpbGVIYXNDaGFuZ2VkKSB7XG4gICAgICAgIHJldHVybiBjYWNoZUVudHJ5LmluZm87XG4gICAgICB9XG5cbiAgICAgIGQoYEludmFsaWRhdGluZyBjYWNoZSBlbnRyeTogJHtjYWNoZUVudHJ5LmN0aW1lfSA9PT0gJHtjdGltZX0gJiYgJHtjYWNoZUVudHJ5LnNpemV9ID09PSAke3NpemV9YCk7XG4gICAgICBkZWxldGUgdGhpcy5jaGFuZ2VDYWNoZS5jYWNoZUVudHJ5O1xuICAgIH1cblxuICAgIGxldCB7ZGlnZXN0LCBzb3VyY2VDb2RlLCBiaW5hcnlEYXRhfSA9IGF3YWl0IHRoaXMuY2FsY3VsYXRlSGFzaEZvckZpbGUoYWJzb2x1dGVGaWxlUGF0aCk7XG5cbiAgICBsZXQgaW5mbyA9IHtcbiAgICAgIGhhc2g6IGRpZ2VzdCxcbiAgICAgIGlzTWluaWZpZWQ6IEZpbGVDaGFuZ2VkQ2FjaGUuY29udGVudHNBcmVNaW5pZmllZChzb3VyY2VDb2RlIHx8ICcnKSxcbiAgICAgIGlzSW5Ob2RlTW9kdWxlczogRmlsZUNoYW5nZWRDYWNoZS5pc0luTm9kZU1vZHVsZXMoYWJzb2x1dGVGaWxlUGF0aCksXG4gICAgICBoYXNTb3VyY2VNYXA6IEZpbGVDaGFuZ2VkQ2FjaGUuaGFzU291cmNlTWFwKHNvdXJjZUNvZGUgfHwgJycpLFxuICAgICAgaXNGaWxlQmluYXJ5OiAhIWJpbmFyeURhdGFcbiAgICB9O1xuXG4gICAgdGhpcy5jaGFuZ2VDYWNoZVtjYWNoZUtleV0gPSB7IGN0aW1lLCBzaXplLCBpbmZvIH07XG4gICAgZChgQ2FjaGUgZW50cnkgZm9yICR7Y2FjaGVLZXl9OiAke0pTT04uc3RyaW5naWZ5KHRoaXMuY2hhbmdlQ2FjaGVbY2FjaGVLZXldKX1gKTtcblxuICAgIGlmIChiaW5hcnlEYXRhKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7YmluYXJ5RGF0YX0sIGluZm8pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7c291cmNlQ29kZX0sIGluZm8pO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGdldEluZm9Gb3JDYWNoZUVudHJ5KGFic29sdXRlRmlsZVBhdGgpIHtcbiAgICBsZXQgc3RhdCA9IGF3YWl0IHBmcy5zdGF0KGFic29sdXRlRmlsZVBhdGgpO1xuICAgIGlmICghc3RhdCB8fCAhc3RhdC5pc0ZpbGUoKSkgdGhyb3cgbmV3IEVycm9yKGBDYW4ndCBzdGF0ICR7YWJzb2x1dGVGaWxlUGF0aH1gKTtcblxuICAgIHJldHVybiB7XG4gICAgICBzdGF0LFxuICAgICAgY3RpbWU6IHN0YXQuY3RpbWUuZ2V0VGltZSgpLFxuICAgICAgc2l6ZTogc3RhdC5zaXplXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBjYWNoZWQgZGF0YSBmb3IgYSBmaWxlIHBhdGgsIGlmIGl0IGV4aXN0cy5cbiAgICpcbiAgICogQHBhcmFtICB7c3RyaW5nfSBhYnNvbHV0ZUZpbGVQYXRoICBUaGUgcGF0aCB0byBhIGZpbGUgdG8gcmV0cmlldmUgaW5mbyBvbi5cbiAgICpcbiAgICogQHJldHVybiB7T2JqZWN0fVxuICAgKi9cbiAgZ2V0Q2FjaGVFbnRyeUZvclBhdGgoYWJzb2x1dGVGaWxlUGF0aCkge1xuICAgIGxldCBjYWNoZUtleSA9IHNhbml0aXplRmlsZVBhdGgoYWJzb2x1dGVGaWxlUGF0aCk7XG4gICAgaWYgKHRoaXMuYXBwUm9vdCkge1xuICAgICAgY2FjaGVLZXkgPSBjYWNoZUtleS5yZXBsYWNlKHRoaXMuYXBwUm9vdCwgJycpO1xuICAgIH1cblxuICAgIC8vIE5COiBXZSBkbyB0aGlzIGJlY2F1c2UgeC1yZXF1aXJlIHdpbGwgaW5jbHVkZSBhbiBhYnNvbHV0ZSBwYXRoIGZyb20gdGhlXG4gICAgLy8gb3JpZ2luYWwgYnVpbHQgYXBwIGFuZCB3ZSBuZWVkIHRvIHN0aWxsIGdyb2sgaXRcbiAgICBpZiAodGhpcy5vcmlnaW5hbEFwcFJvb3QpIHtcbiAgICAgIGNhY2hlS2V5ID0gY2FjaGVLZXkucmVwbGFjZSh0aGlzLm9yaWdpbmFsQXBwUm9vdCwgJycpO1xuICAgIH1cblxuICAgIGxldCBjYWNoZUVudHJ5ID0gdGhpcy5jaGFuZ2VDYWNoZVtjYWNoZUtleV07XG5cbiAgICBpZiAodGhpcy5mYWlsT25DYWNoZU1pc3MpIHtcbiAgICAgIGlmICghY2FjaGVFbnRyeSkge1xuICAgICAgICBkKGBUcmllZCB0byByZWFkIGZpbGUgY2FjaGUgZW50cnkgZm9yICR7YWJzb2x1dGVGaWxlUGF0aH1gKTtcbiAgICAgICAgZChgY2FjaGVLZXk6ICR7Y2FjaGVLZXl9LCBhcHBSb290OiAke3RoaXMuYXBwUm9vdH0sIG9yaWdpbmFsQXBwUm9vdDogJHt0aGlzLm9yaWdpbmFsQXBwUm9vdH1gKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBBc2tlZCBmb3IgJHthYnNvbHV0ZUZpbGVQYXRofSBidXQgaXQgd2FzIG5vdCBwcmVjb21waWxlZCFgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge2NhY2hlRW50cnksIGNhY2hlS2V5fTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgdGhlIGZpbGUgY2FjaGUgdG8gc2VlIGlmIGEgZmlsZSBoYXMgY2hhbmdlZC5cbiAgICpcbiAgICogQHBhcmFtICB7c3RyaW5nfSBhYnNvbHV0ZUZpbGVQYXRoICBUaGUgcGF0aCB0byBhIGZpbGUgdG8gcmV0cmlldmUgaW5mbyBvbi5cbiAgICogQHBhcmFtICB7T2JqZWN0fSBjYWNoZUVudHJ5ICBDYWNoZSBkYXRhIGZyb20ge0BsaW5rIGdldENhY2hlRW50cnlGb3JQYXRofVxuICAgKlxuICAgKiBAcmV0dXJuIHtib29sZWFufVxuICAgKi9cbiAgYXN5bmMgaGFzRmlsZUNoYW5nZWQoYWJzb2x1dGVGaWxlUGF0aCwgY2FjaGVFbnRyeT1udWxsLCBmaWxlSGFzaEluZm89bnVsbCkge1xuICAgIGNhY2hlRW50cnkgPSBjYWNoZUVudHJ5IHx8IHRoaXMuZ2V0Q2FjaGVFbnRyeUZvclBhdGgoYWJzb2x1dGVGaWxlUGF0aCkuY2FjaGVFbnRyeTtcbiAgICBmaWxlSGFzaEluZm8gPSBmaWxlSGFzaEluZm8gfHwgYXdhaXQgdGhpcy5nZXRJbmZvRm9yQ2FjaGVFbnRyeShhYnNvbHV0ZUZpbGVQYXRoKTtcblxuICAgIGlmIChjYWNoZUVudHJ5KSB7XG4gICAgICByZXR1cm4gIShjYWNoZUVudHJ5LmN0aW1lID49IGZpbGVIYXNoSW5mby5jdGltZSAmJiBjYWNoZUVudHJ5LnNpemUgPT09IGZpbGVIYXNoSW5mby5zaXplKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBkYXRhIHRoYXQgY2FuIHBhc3NlZCB0byB7QGxpbmsgbG9hZEZyb21EYXRhfSB0byByZWh5ZHJhdGUgdGhpcyBjYWNoZS5cbiAgICpcbiAgICogQHJldHVybiB7T2JqZWN0fVxuICAgKi9cbiAgZ2V0U2F2ZWREYXRhKCkge1xuICAgIHJldHVybiB7IGNoYW5nZUNhY2hlOiB0aGlzLmNoYW5nZUNhY2hlLCBhcHBSb290OiB0aGlzLmFwcFJvb3QgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXJpYWxpemVzIHRoaXMgb2JqZWN0J3MgZGF0YSB0byBhIGZpbGUuXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAgVGhlIHBhdGggdG8gc2F2ZSBkYXRhIHRvLlxuICAgKlxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSBDb21wbGV0aW9uLlxuICAgKi9cbiAgYXN5bmMgc2F2ZShmaWxlUGF0aCkge1xuICAgIGxldCB0b1NhdmUgPSB0aGlzLmdldFNhdmVkRGF0YSgpO1xuXG4gICAgbGV0IGJ1ZiA9IGF3YWl0IHB6bGliLmd6aXAobmV3IEJ1ZmZlcihKU09OLnN0cmluZ2lmeSh0b1NhdmUpKSk7XG4gICAgYXdhaXQgcGZzLndyaXRlRmlsZShmaWxlUGF0aCwgYnVmKTtcbiAgfVxuXG4gIGFzeW5jIGNhbGN1bGF0ZUhhc2hGb3JGaWxlKGFic29sdXRlRmlsZVBhdGgpIHtcbiAgICBsZXQgYnVmID0gYXdhaXQgcGZzLnJlYWRGaWxlKGFic29sdXRlRmlsZVBhdGgpO1xuICAgIGxldCBlbmNvZGluZyA9IEZpbGVDaGFuZ2VkQ2FjaGUuZGV0ZWN0RmlsZUVuY29kaW5nKGJ1Zik7XG5cbiAgICBpZiAoIWVuY29kaW5nKSB7XG4gICAgICBsZXQgZGlnZXN0ID0gY3J5cHRvLmNyZWF0ZUhhc2goJ3NoYTEnKS51cGRhdGUoYnVmKS5kaWdlc3QoJ2hleCcpO1xuICAgICAgcmV0dXJuIHsgc291cmNlQ29kZTogbnVsbCwgZGlnZXN0LCBiaW5hcnlEYXRhOiBidWYgfTtcbiAgICB9XG5cbiAgICBsZXQgc291cmNlQ29kZSA9IGF3YWl0IHBmcy5yZWFkRmlsZShhYnNvbHV0ZUZpbGVQYXRoLCBlbmNvZGluZyk7XG4gICAgbGV0IGRpZ2VzdCA9IGNyeXB0by5jcmVhdGVIYXNoKCdzaGExJykudXBkYXRlKHNvdXJjZUNvZGUsICd1dGY4JykuZGlnZXN0KCdoZXgnKTtcblxuICAgIHJldHVybiB7c291cmNlQ29kZSwgZGlnZXN0LCBiaW5hcnlEYXRhOiBudWxsIH07XG4gIH1cblxuICBnZXRIYXNoRm9yUGF0aFN5bmMoYWJzb2x1dGVGaWxlUGF0aCkge1xuICAgIGxldCBjYWNoZUtleSA9IHNhbml0aXplRmlsZVBhdGgoYWJzb2x1dGVGaWxlUGF0aCk7XG5cbiAgICBpZiAodGhpcy5hcHBSb290KSB7XG4gICAgICBjYWNoZUtleSA9IEZpbGVDaGFuZ2VkQ2FjaGUucmVtb3ZlUHJlZml4KHRoaXMuYXBwUm9vdCwgY2FjaGVLZXkpO1xuICAgIH1cblxuICAgIC8vIE5COiBXZSBkbyB0aGlzIGJlY2F1c2UgeC1yZXF1aXJlIHdpbGwgaW5jbHVkZSBhbiBhYnNvbHV0ZSBwYXRoIGZyb20gdGhlXG4gICAgLy8gb3JpZ2luYWwgYnVpbHQgYXBwIGFuZCB3ZSBuZWVkIHRvIHN0aWxsIGdyb2sgaXRcbiAgICBpZiAodGhpcy5vcmlnaW5hbEFwcFJvb3QpIHtcbiAgICAgIGNhY2hlS2V5ID0gRmlsZUNoYW5nZWRDYWNoZS5yZW1vdmVQcmVmaXgodGhpcy5vcmlnaW5hbEFwcFJvb3QsIGNhY2hlS2V5KTtcbiAgICB9XG5cbiAgICBsZXQgY2FjaGVFbnRyeSA9IHRoaXMuY2hhbmdlQ2FjaGVbY2FjaGVLZXldO1xuXG4gICAgaWYgKHRoaXMuZmFpbE9uQ2FjaGVNaXNzKSB7XG4gICAgICBpZiAoIWNhY2hlRW50cnkpIHtcbiAgICAgICAgZChgVHJpZWQgdG8gcmVhZCBmaWxlIGNhY2hlIGVudHJ5IGZvciAke2Fic29sdXRlRmlsZVBhdGh9YCk7XG4gICAgICAgIGQoYGNhY2hlS2V5OiAke2NhY2hlS2V5fSwgYXBwUm9vdDogJHt0aGlzLmFwcFJvb3R9LCBvcmlnaW5hbEFwcFJvb3Q6ICR7dGhpcy5vcmlnaW5hbEFwcFJvb3R9YCk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQXNrZWQgZm9yICR7YWJzb2x1dGVGaWxlUGF0aH0gYnV0IGl0IHdhcyBub3QgcHJlY29tcGlsZWQhYCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBjYWNoZUVudHJ5LmluZm87XG4gICAgfVxuXG4gICAgbGV0IHN0YXQgPSBmcy5zdGF0U3luYyhhYnNvbHV0ZUZpbGVQYXRoKTtcbiAgICBsZXQgY3RpbWUgPSBzdGF0LmN0aW1lLmdldFRpbWUoKTtcbiAgICBsZXQgc2l6ZSA9IHN0YXQuc2l6ZTtcbiAgICBpZiAoIXN0YXQgfHwgIXN0YXQuaXNGaWxlKCkpIHRocm93IG5ldyBFcnJvcihgQ2FuJ3Qgc3RhdCAke2Fic29sdXRlRmlsZVBhdGh9YCk7XG5cbiAgICBpZiAoY2FjaGVFbnRyeSkge1xuICAgICAgaWYgKGNhY2hlRW50cnkuY3RpbWUgPj0gY3RpbWUgJiYgY2FjaGVFbnRyeS5zaXplID09PSBzaXplKSB7XG4gICAgICAgIHJldHVybiBjYWNoZUVudHJ5LmluZm87XG4gICAgICB9XG5cbiAgICAgIGQoYEludmFsaWRhdGluZyBjYWNoZSBlbnRyeTogJHtjYWNoZUVudHJ5LmN0aW1lfSA9PT0gJHtjdGltZX0gJiYgJHtjYWNoZUVudHJ5LnNpemV9ID09PSAke3NpemV9YCk7XG4gICAgICBkZWxldGUgdGhpcy5jaGFuZ2VDYWNoZS5jYWNoZUVudHJ5O1xuICAgIH1cblxuICAgIGxldCB7ZGlnZXN0LCBzb3VyY2VDb2RlLCBiaW5hcnlEYXRhfSA9IHRoaXMuY2FsY3VsYXRlSGFzaEZvckZpbGVTeW5jKGFic29sdXRlRmlsZVBhdGgpO1xuXG4gICAgbGV0IGluZm8gPSB7XG4gICAgICBoYXNoOiBkaWdlc3QsXG4gICAgICBpc01pbmlmaWVkOiBGaWxlQ2hhbmdlZENhY2hlLmNvbnRlbnRzQXJlTWluaWZpZWQoc291cmNlQ29kZSB8fCAnJyksXG4gICAgICBpc0luTm9kZU1vZHVsZXM6IEZpbGVDaGFuZ2VkQ2FjaGUuaXNJbk5vZGVNb2R1bGVzKGFic29sdXRlRmlsZVBhdGgpLFxuICAgICAgaGFzU291cmNlTWFwOiBGaWxlQ2hhbmdlZENhY2hlLmhhc1NvdXJjZU1hcChzb3VyY2VDb2RlIHx8ICcnKSxcbiAgICAgIGlzRmlsZUJpbmFyeTogISFiaW5hcnlEYXRhXG4gICAgfTtcblxuICAgIHRoaXMuY2hhbmdlQ2FjaGVbY2FjaGVLZXldID0geyBjdGltZSwgc2l6ZSwgaW5mbyB9O1xuICAgIGQoYENhY2hlIGVudHJ5IGZvciAke2NhY2hlS2V5fTogJHtKU09OLnN0cmluZ2lmeSh0aGlzLmNoYW5nZUNhY2hlW2NhY2hlS2V5XSl9YCk7XG5cbiAgICBpZiAoYmluYXJ5RGF0YSkge1xuICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe2JpbmFyeURhdGF9LCBpbmZvKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe3NvdXJjZUNvZGV9LCBpbmZvKTtcbiAgICB9XG4gIH1cblxuICBzYXZlU3luYyhmaWxlUGF0aCkge1xuICAgIGxldCB0b1NhdmUgPSB0aGlzLmdldFNhdmVkRGF0YSgpO1xuXG4gICAgbGV0IGJ1ZiA9IHpsaWIuZ3ppcFN5bmMobmV3IEJ1ZmZlcihKU09OLnN0cmluZ2lmeSh0b1NhdmUpKSk7XG4gICAgZnMud3JpdGVGaWxlU3luYyhmaWxlUGF0aCwgYnVmKTtcbiAgfVxuXG4gIGNhbGN1bGF0ZUhhc2hGb3JGaWxlU3luYyhhYnNvbHV0ZUZpbGVQYXRoKSB7XG4gICAgbGV0IGJ1ZiA9IGZzLnJlYWRGaWxlU3luYyhhYnNvbHV0ZUZpbGVQYXRoKTtcbiAgICBsZXQgZW5jb2RpbmcgPSBGaWxlQ2hhbmdlZENhY2hlLmRldGVjdEZpbGVFbmNvZGluZyhidWYpO1xuXG4gICAgaWYgKCFlbmNvZGluZykge1xuICAgICAgbGV0IGRpZ2VzdCA9IGNyeXB0by5jcmVhdGVIYXNoKCdzaGExJykudXBkYXRlKGJ1ZikuZGlnZXN0KCdoZXgnKTtcbiAgICAgIHJldHVybiB7IHNvdXJjZUNvZGU6IG51bGwsIGRpZ2VzdCwgYmluYXJ5RGF0YTogYnVmfTtcbiAgICB9XG5cbiAgICBsZXQgc291cmNlQ29kZSA9IGZzLnJlYWRGaWxlU3luYyhhYnNvbHV0ZUZpbGVQYXRoLCBlbmNvZGluZyk7XG4gICAgbGV0IGRpZ2VzdCA9IGNyeXB0by5jcmVhdGVIYXNoKCdzaGExJykudXBkYXRlKHNvdXJjZUNvZGUsICd1dGY4JykuZGlnZXN0KCdoZXgnKTtcblxuICAgIHJldHVybiB7c291cmNlQ29kZSwgZGlnZXN0LCBiaW5hcnlEYXRhOiBudWxsfTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIERldGVybWluZXMgdmlhIHNvbWUgc3RhdGlzdGljcyB3aGV0aGVyIGEgZmlsZSBpcyBsaWtlbHkgdG8gYmUgbWluaWZpZWQuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBzdGF0aWMgY29udGVudHNBcmVNaW5pZmllZChzb3VyY2UpIHtcbiAgICBsZXQgbGVuZ3RoID0gc291cmNlLmxlbmd0aDtcbiAgICBpZiAobGVuZ3RoID4gMTAyNCkgbGVuZ3RoID0gMTAyNDtcblxuICAgIGxldCBuZXdsaW5lQ291bnQgPSAwO1xuXG4gICAgLy8gUm9sbCB0aHJvdWdoIHRoZSBjaGFyYWN0ZXJzIGFuZCBkZXRlcm1pbmUgdGhlIGF2ZXJhZ2UgbGluZSBsZW5ndGhcbiAgICBmb3IobGV0IGk9MDsgaSA8IHNvdXJjZS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHNvdXJjZVtpXSA9PT0gJ1xcbicpIG5ld2xpbmVDb3VudCsrO1xuICAgIH1cblxuICAgIC8vIE5vIE5ld2xpbmVzPyBBbnkgZmlsZSBvdGhlciB0aGFuIGEgc3VwZXIgc21hbGwgb25lIGlzIG1pbmlmaWVkXG4gICAgaWYgKG5ld2xpbmVDb3VudCA9PT0gMCkge1xuICAgICAgcmV0dXJuIChsZW5ndGggPiA4MCk7XG4gICAgfVxuXG4gICAgbGV0IGF2Z0xpbmVMZW5ndGggPSBsZW5ndGggLyBuZXdsaW5lQ291bnQ7XG4gICAgcmV0dXJuIChhdmdMaW5lTGVuZ3RoID4gODApO1xuICB9XG5cblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyB3aGV0aGVyIGEgcGF0aCBpcyBpbiBub2RlX21vZHVsZXMgb3IgdGhlIEVsZWN0cm9uIGluaXQgY29kZVxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgc3RhdGljIGlzSW5Ob2RlTW9kdWxlcyhmaWxlUGF0aCkge1xuICAgIHJldHVybiAhIShmaWxlUGF0aC5tYXRjaCgvKG5vZGVfbW9kdWxlc3xib3dlcl9jb21wb25lbnRzKVtcXFxcXFwvXS9pKSB8fCBmaWxlUGF0aC5tYXRjaCgvKGF0b218ZWxlY3Ryb24pXFwuYXNhci8pKTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIFJldHVybnMgd2hldGhlciBhIGZpbGUgaGFzIGFuIGlubGluZSBzb3VyY2UgbWFwXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBzdGF0aWMgaGFzU291cmNlTWFwKHNvdXJjZUNvZGUpIHtcbiAgICBjb25zdCB0cmltbWVkID0gc291cmNlQ29kZS50cmltKCk7XG4gICAgcmV0dXJuIHRyaW1tZWQubGFzdEluZGV4T2YoJy8vIyBzb3VyY2VNYXAnKSA+IHRyaW1tZWQubGFzdEluZGV4T2YoJ1xcbicpO1xuICB9XG5cbiAgLyoqXG4gICAqIERldGVybWluZXMgdGhlIGVuY29kaW5nIG9mIGEgZmlsZSBmcm9tIHRoZSB0d28gbW9zdCBjb21tb24gZW5jb2RpbmdzIGJ5IHRyeWluZ1xuICAgKiB0byBkZWNvZGUgaXQgdGhlbiBsb29raW5nIGZvciBlbmNvZGluZyBlcnJvcnNcbiAgICpcbiAgICogQHByaXZhdGVcbiAgICovXG4gIHN0YXRpYyBkZXRlY3RGaWxlRW5jb2RpbmcoYnVmZmVyKSB7XG4gICAgaWYgKGJ1ZmZlci5sZW5ndGggPCAxKSByZXR1cm4gZmFsc2U7XG4gICAgbGV0IGJ1ZiA9IChidWZmZXIubGVuZ3RoIDwgNDA5NiA/IGJ1ZmZlciA6IGJ1ZmZlci5zbGljZSgwLCA0MDk2KSk7XG5cbiAgICBjb25zdCBlbmNvZGluZ3MgPSBbJ3V0ZjgnLCAndXRmMTZsZSddO1xuXG4gICAgbGV0IGVuY29kaW5nO1xuICAgIGlmIChidWZmZXIubGVuZ3RoIDw9IDEyOCkge1xuICAgICAgZW5jb2RpbmcgPSBlbmNvZGluZ3MuZmluZCh4ID0+XG4gICAgICAgIEJ1ZmZlci5jb21wYXJlKG5ldyBCdWZmZXIoYnVmZmVyLnRvU3RyaW5nKCksIHgpLCBidWZmZXIpID09PSAwXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbmNvZGluZyA9IGVuY29kaW5ncy5maW5kKHggPT4gIUZpbGVDaGFuZ2VkQ2FjaGUuY29udGFpbnNDb250cm9sQ2hhcmFjdGVycyhidWYudG9TdHJpbmcoeCkpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZW5jb2Rpbmc7XG4gIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyB3aGV0aGVyIGEgc3RyaW5nIGlzIGxpa2VseSB0byBiZSBwb29ybHkgZW5jb2RlZCBieSBsb29raW5nIGZvclxuICAgKiBjb250cm9sIGNoYXJhY3RlcnMgYWJvdmUgYSBjZXJ0YWluIHRocmVzaG9sZFxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgc3RhdGljIGNvbnRhaW5zQ29udHJvbENoYXJhY3RlcnMoc3RyKSB7XG4gICAgbGV0IGNvbnRyb2xDb3VudCA9IDA7XG4gICAgbGV0IHNwYWNlQ291bnQgPSAwO1xuICAgIGxldCB0aHJlc2hvbGQgPSAyO1xuICAgIGlmIChzdHIubGVuZ3RoID4gNjQpIHRocmVzaG9sZCA9IDQ7XG4gICAgaWYgKHN0ci5sZW5ndGggPiA1MTIpIHRocmVzaG9sZCA9IDg7XG5cbiAgICBmb3IgKGxldCBpPTA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxldCBjID0gc3RyLmNoYXJDb2RlQXQoaSk7XG4gICAgICBpZiAoYyA9PT0gNjU1MzYgfHwgYyA8IDgpIGNvbnRyb2xDb3VudCsrO1xuICAgICAgaWYgKGMgPiAxNCAmJiBjIDwgMzIpIGNvbnRyb2xDb3VudCsrO1xuICAgICAgaWYgKGMgPT09IDMyKSBzcGFjZUNvdW50Kys7XG5cbiAgICAgIGlmIChjb250cm9sQ291bnQgPiB0aHJlc2hvbGQpIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGlmIChzcGFjZUNvdW50IDwgdGhyZXNob2xkKSByZXR1cm4gdHJ1ZTtcblxuICAgIGlmIChjb250cm9sQ291bnQgPT09IDApIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gKGNvbnRyb2xDb3VudCAvIHN0ci5sZW5ndGgpIDwgMC4wMjtcbiAgfVxufVxuIl19