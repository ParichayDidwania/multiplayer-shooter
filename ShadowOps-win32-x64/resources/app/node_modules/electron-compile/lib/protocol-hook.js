'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.rigHtmlDocumentToInitializeElectronCompile = rigHtmlDocumentToInitializeElectronCompile;
exports.addBypassChecker = addBypassChecker;
exports.initializeProtocolHook = initializeProtocolHook;

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _mimeTypes = require('@paulcbetts/mime-types');

var _mimeTypes2 = _interopRequireDefault(_mimeTypes);

var _lruCache = require('lru-cache');

var _lruCache2 = _interopRequireDefault(_lruCache);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const magicWords = "__magic__file__to__help__electron__compile.js";

// NB: These are duped in initialize-renderer so we can save startup time, make
// sure to run both!
const magicGlobalForRootCacheDir = '__electron_compile_root_cache_dir';
const magicGlobalForAppRootDir = '__electron_compile_app_root_dir';

const d = require('debug')('electron-compile:protocol-hook');

let protocol = null;

const mapStatCache = new _lruCache2.default({ length: 512 });
function doesMapFileExist(filePath) {
  let ret = mapStatCache.get(filePath);
  if (ret !== undefined) return Promise.resolve(ret);

  return new Promise(res => {
    _fs2.default.lstat(filePath, (err, s) => {
      let failed = err || !s;

      mapStatCache.set(filePath, !failed);
      res(!failed);
    });
  });
}

/**
 * Adds our script header to the top of all HTML files
 *
 * @private
 */
function rigHtmlDocumentToInitializeElectronCompile(doc) {
  let lines = doc.split("\n");
  let replacement = `<head><script src="${magicWords}"></script>`;
  let replacedHead = false;

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].match(/<head>/i)) continue;

    lines[i] = lines[i].replace(/<head>/i, replacement);
    replacedHead = true;
    break;
  }

  if (!replacedHead) {
    replacement = `<html$1><head><script src="${magicWords}"></script></head>`;
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].match(/<html/i)) continue;

      lines[i] = lines[i].replace(/<html([^>]+)>/i, replacement);
      break;
    }
  }

  return lines.join("\n");
}

function requestFileJob(filePath, finish) {
  _fs2.default.readFile(filePath, (err, buf) => {
    if (err) {
      if (err.errno === 34) {
        finish(-6); // net::ERR_FILE_NOT_FOUND
        return;
      } else {
        finish(-2); // net::FAILED
        return;
      }
    }

    finish({
      data: buf,
      mimeType: _mimeTypes2.default.lookup(filePath) || 'text/plain'
    });
  });
}

const bypassCheckers = [];

/**
 * Adds a function that will be called on electron-compile's protocol hook
 * used to intercept file requests.  Use this to bypass electron-compile
 * entirely for certain URI's.
 * 
 * @param {Function} bypassChecker Function that will be called with the file path to determine whether to bypass or not
 */
function addBypassChecker(bypassChecker) {
  bypassCheckers.push(bypassChecker);
}

/**
 * Initializes the protocol hook on file: that allows us to intercept files
 * loaded by Chromium and rewrite them. This method along with
 * {@link registerRequireExtension} are the top-level methods that electron-compile
 * actually uses to intercept code that Electron loads.
 *
 * @param  {CompilerHost} compilerHost  The compiler host to use for compilation.
 */
function initializeProtocolHook(compilerHost) {
  protocol = protocol || require('electron').protocol;

  global[magicGlobalForRootCacheDir] = compilerHost.rootCacheDir;
  global[magicGlobalForAppRootDir] = compilerHost.appRoot;

  const electronCompileSetupCode = `if (window.require) require('electron-compile/lib/initialize-renderer').initializeRendererProcess(${compilerHost.readOnlyMode});`;

  protocol.interceptBufferProtocol('file', (() => {
    var _ref = _asyncToGenerator(function* (request, finish) {
      let uri = _url2.default.parse(request.url);

      d(`Intercepting url ${request.url}`);
      if (request.url.indexOf(magicWords) > -1) {
        finish({
          mimeType: 'application/javascript',
          data: new Buffer(electronCompileSetupCode, 'utf8')
        });

        return;
      }

      // This is a protocol-relative URL that has gone pear-shaped in Electron,
      // let's rewrite it
      if (uri.host && uri.host.length > 1) {
        //let newUri = request.url.replace(/^file:/, "https:");
        // TODO: Jump off this bridge later
        d(`TODO: Found bogus protocol-relative URL, can't fix it up!!`);
        finish(-2);
        return;
      }

      let filePath = decodeURIComponent(uri.pathname);

      // NB: pathname has a leading '/' on Win32 for some reason
      if (process.platform === 'win32') {
        filePath = filePath.slice(1);
      }

      // NB: Special-case files coming from atom.asar or node_modules
      if (filePath.match(/[\/\\](atom|electron).asar/) || filePath.match(/[\/\\](node_modules|bower_components)/)) {
        // NBs on NBs: If we're loading an HTML file from node_modules, we still have
        // to do the HTML document rigging
        if (filePath.match(/\.html?$/i)) {
          let riggedContents = null;
          _fs2.default.readFile(filePath, 'utf8', function (err, contents) {
            if (err) {
              if (err.errno === 34) {
                finish(-6); // net::ERR_FILE_NOT_FOUND
                return;
              } else {
                finish(-2); // net::FAILED
                return;
              }
            }

            riggedContents = rigHtmlDocumentToInitializeElectronCompile(contents);
            finish({ data: new Buffer(riggedContents), mimeType: 'text/html' });
            return;
          });

          return;
        }

        requestFileJob(filePath, finish);
        return;
      }

      // NB: Chromium will somehow decide that external source map references
      // aren't relative to the file that was loaded for node.js modules, but
      // relative to the HTML file. Since we can't really figure out what the
      // real path is, we just need to squelch it.
      if (filePath.match(/\.map$/i) && !(yield doesMapFileExist(filePath))) {
        finish({ data: new Buffer("", 'utf8'), mimeType: 'text/plain' });
        return;
      }

      for (const bypassChecker of bypassCheckers) {
        if (bypassChecker(filePath)) {
          d('bypassing compilers for:', filePath);
          requestFileJob(filePath, finish);
          return;
        }
      }

      try {
        let result = yield compilerHost.compile(filePath);

        if (result.mimeType === 'text/html') {
          result.code = rigHtmlDocumentToInitializeElectronCompile(result.code);
        }

        if (result.binaryData || result.code instanceof Buffer) {
          finish({ data: result.binaryData || result.code, mimeType: result.mimeType });
          return;
        } else {
          finish({ data: new Buffer(result.code), mimeType: result.mimeType });
          return;
        }
      } catch (e) {
        let err = `Failed to compile ${filePath}: ${e.message}\n${e.stack}`;
        d(err);

        if (e.errno === 34 /*ENOENT*/) {
            finish(-6); // net::ERR_FILE_NOT_FOUND
            return;
          }

        finish({ mimeType: 'text/plain', data: new Buffer(err) });
        return;
      }
    });

    return function (_x, _x2) {
      return _ref.apply(this, arguments);
    };
  })());
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9wcm90b2NvbC1ob29rLmpzIl0sIm5hbWVzIjpbInJpZ0h0bWxEb2N1bWVudFRvSW5pdGlhbGl6ZUVsZWN0cm9uQ29tcGlsZSIsImFkZEJ5cGFzc0NoZWNrZXIiLCJpbml0aWFsaXplUHJvdG9jb2xIb29rIiwibWFnaWNXb3JkcyIsIm1hZ2ljR2xvYmFsRm9yUm9vdENhY2hlRGlyIiwibWFnaWNHbG9iYWxGb3JBcHBSb290RGlyIiwiZCIsInJlcXVpcmUiLCJwcm90b2NvbCIsIm1hcFN0YXRDYWNoZSIsIkxSVSIsImxlbmd0aCIsImRvZXNNYXBGaWxlRXhpc3QiLCJmaWxlUGF0aCIsInJldCIsImdldCIsInVuZGVmaW5lZCIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVzIiwiZnMiLCJsc3RhdCIsImVyciIsInMiLCJmYWlsZWQiLCJzZXQiLCJkb2MiLCJsaW5lcyIsInNwbGl0IiwicmVwbGFjZW1lbnQiLCJyZXBsYWNlZEhlYWQiLCJpIiwibWF0Y2giLCJyZXBsYWNlIiwiam9pbiIsInJlcXVlc3RGaWxlSm9iIiwiZmluaXNoIiwicmVhZEZpbGUiLCJidWYiLCJlcnJubyIsImRhdGEiLCJtaW1lVHlwZSIsIm1pbWUiLCJsb29rdXAiLCJieXBhc3NDaGVja2VycyIsImJ5cGFzc0NoZWNrZXIiLCJwdXNoIiwiY29tcGlsZXJIb3N0IiwiZ2xvYmFsIiwicm9vdENhY2hlRGlyIiwiYXBwUm9vdCIsImVsZWN0cm9uQ29tcGlsZVNldHVwQ29kZSIsInJlYWRPbmx5TW9kZSIsImludGVyY2VwdEJ1ZmZlclByb3RvY29sIiwicmVxdWVzdCIsInVyaSIsInVybCIsInBhcnNlIiwiaW5kZXhPZiIsIkJ1ZmZlciIsImhvc3QiLCJkZWNvZGVVUklDb21wb25lbnQiLCJwYXRobmFtZSIsInByb2Nlc3MiLCJwbGF0Zm9ybSIsInNsaWNlIiwicmlnZ2VkQ29udGVudHMiLCJjb250ZW50cyIsInJlc3VsdCIsImNvbXBpbGUiLCJjb2RlIiwiYmluYXJ5RGF0YSIsImUi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QTtBQUFBO0FBQUE7QUF1R0QiLCJmaWxlIjoicHJvdG9jb2wtaG9vay5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB1cmwgZnJvbSAndXJsJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgbWltZSBmcm9tICdAcGF1bGNiZXR0cy9taW1lLXR5cGVzJztcbmltcG9ydCBMUlUgZnJvbSAnbHJ1LWNhY2hlJztcblxuY29uc3QgbWFnaWNXb3JkcyA9IFwiX19tYWdpY19fZmlsZV9fdG9fX2hlbHBfX2VsZWN0cm9uX19jb21waWxlLmpzXCI7XG5cbi8vIE5COiBUaGVzZSBhcmUgZHVwZWQgaW4gaW5pdGlhbGl6ZS1yZW5kZXJlciBzbyB3ZSBjYW4gc2F2ZSBzdGFydHVwIHRpbWUsIG1ha2Vcbi8vIHN1cmUgdG8gcnVuIGJvdGghXG5jb25zdCBtYWdpY0dsb2JhbEZvclJvb3RDYWNoZURpciA9ICdfX2VsZWN0cm9uX2NvbXBpbGVfcm9vdF9jYWNoZV9kaXInO1xuY29uc3QgbWFnaWNHbG9iYWxGb3JBcHBSb290RGlyID0gJ19fZWxlY3Ryb25fY29tcGlsZV9hcHBfcm9vdF9kaXInO1xuXG5jb25zdCBkID0gcmVxdWlyZSgnZGVidWcnKSgnZWxlY3Ryb24tY29tcGlsZTpwcm90b2NvbC1ob29rJyk7XG5cbmxldCBwcm90b2NvbCA9IG51bGw7XG5cbmNvbnN0IG1hcFN0YXRDYWNoZSA9IG5ldyBMUlUoe2xlbmd0aDogNTEyfSk7XG5mdW5jdGlvbiBkb2VzTWFwRmlsZUV4aXN0KGZpbGVQYXRoKSB7XG4gIGxldCByZXQgPSBtYXBTdGF0Q2FjaGUuZ2V0KGZpbGVQYXRoKTtcbiAgaWYgKHJldCAhPT0gdW5kZWZpbmVkKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJldCk7XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXMpID0+IHtcbiAgICBmcy5sc3RhdChmaWxlUGF0aCwgKGVyciwgcykgPT4ge1xuICAgICAgbGV0IGZhaWxlZCA9IChlcnIgfHwgIXMpO1xuXG4gICAgICBtYXBTdGF0Q2FjaGUuc2V0KGZpbGVQYXRoLCAhZmFpbGVkKTtcbiAgICAgIHJlcyghZmFpbGVkKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbi8qKlxuICogQWRkcyBvdXIgc2NyaXB0IGhlYWRlciB0byB0aGUgdG9wIG9mIGFsbCBIVE1MIGZpbGVzXG4gKlxuICogQHByaXZhdGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJpZ0h0bWxEb2N1bWVudFRvSW5pdGlhbGl6ZUVsZWN0cm9uQ29tcGlsZShkb2MpIHtcbiAgbGV0IGxpbmVzID0gZG9jLnNwbGl0KFwiXFxuXCIpO1xuICBsZXQgcmVwbGFjZW1lbnQgPSBgPGhlYWQ+PHNjcmlwdCBzcmM9XCIke21hZ2ljV29yZHN9XCI+PC9zY3JpcHQ+YDtcbiAgbGV0IHJlcGxhY2VkSGVhZCA9IGZhbHNlO1xuXG4gIGZvciAobGV0IGk9MDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKCFsaW5lc1tpXS5tYXRjaCgvPGhlYWQ+L2kpKSBjb250aW51ZTtcblxuICAgIGxpbmVzW2ldID0gKGxpbmVzW2ldKS5yZXBsYWNlKC88aGVhZD4vaSwgcmVwbGFjZW1lbnQpO1xuICAgIHJlcGxhY2VkSGVhZCA9IHRydWU7XG4gICAgYnJlYWs7XG4gIH1cblxuICBpZiAoIXJlcGxhY2VkSGVhZCkge1xuICAgIHJlcGxhY2VtZW50ID0gYDxodG1sJDE+PGhlYWQ+PHNjcmlwdCBzcmM9XCIke21hZ2ljV29yZHN9XCI+PC9zY3JpcHQ+PC9oZWFkPmA7XG4gICAgZm9yIChsZXQgaT0wOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghbGluZXNbaV0ubWF0Y2goLzxodG1sL2kpKSBjb250aW51ZTtcblxuICAgICAgbGluZXNbaV0gPSAobGluZXNbaV0pLnJlcGxhY2UoLzxodG1sKFtePl0rKT4vaSwgcmVwbGFjZW1lbnQpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGxpbmVzLmpvaW4oXCJcXG5cIik7XG59XG5cbmZ1bmN0aW9uIHJlcXVlc3RGaWxlSm9iKGZpbGVQYXRoLCBmaW5pc2gpIHtcbiAgZnMucmVhZEZpbGUoZmlsZVBhdGgsIChlcnIsIGJ1ZikgPT4ge1xuICAgIGlmIChlcnIpIHtcbiAgICAgIGlmIChlcnIuZXJybm8gPT09IDM0KSB7XG4gICAgICAgIGZpbmlzaCgtNik7IC8vIG5ldDo6RVJSX0ZJTEVfTk9UX0ZPVU5EXG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZpbmlzaCgtMik7IC8vIG5ldDo6RkFJTEVEXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmaW5pc2goe1xuICAgICAgZGF0YTogYnVmLFxuICAgICAgbWltZVR5cGU6IG1pbWUubG9va3VwKGZpbGVQYXRoKSB8fCAndGV4dC9wbGFpbidcbiAgICB9KTtcbiAgfSk7XG59XG5cbmNvbnN0IGJ5cGFzc0NoZWNrZXJzID0gW107XG5cbi8qKlxuICogQWRkcyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBiZSBjYWxsZWQgb24gZWxlY3Ryb24tY29tcGlsZSdzIHByb3RvY29sIGhvb2tcbiAqIHVzZWQgdG8gaW50ZXJjZXB0IGZpbGUgcmVxdWVzdHMuICBVc2UgdGhpcyB0byBieXBhc3MgZWxlY3Ryb24tY29tcGlsZVxuICogZW50aXJlbHkgZm9yIGNlcnRhaW4gVVJJJ3MuXG4gKiBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGJ5cGFzc0NoZWNrZXIgRnVuY3Rpb24gdGhhdCB3aWxsIGJlIGNhbGxlZCB3aXRoIHRoZSBmaWxlIHBhdGggdG8gZGV0ZXJtaW5lIHdoZXRoZXIgdG8gYnlwYXNzIG9yIG5vdFxuICovXG5leHBvcnQgZnVuY3Rpb24gYWRkQnlwYXNzQ2hlY2tlcihieXBhc3NDaGVja2VyKSB7XG4gIGJ5cGFzc0NoZWNrZXJzLnB1c2goYnlwYXNzQ2hlY2tlcik7XG59XG5cbi8qKlxuICogSW5pdGlhbGl6ZXMgdGhlIHByb3RvY29sIGhvb2sgb24gZmlsZTogdGhhdCBhbGxvd3MgdXMgdG8gaW50ZXJjZXB0IGZpbGVzXG4gKiBsb2FkZWQgYnkgQ2hyb21pdW0gYW5kIHJld3JpdGUgdGhlbS4gVGhpcyBtZXRob2QgYWxvbmcgd2l0aFxuICoge0BsaW5rIHJlZ2lzdGVyUmVxdWlyZUV4dGVuc2lvbn0gYXJlIHRoZSB0b3AtbGV2ZWwgbWV0aG9kcyB0aGF0IGVsZWN0cm9uLWNvbXBpbGVcbiAqIGFjdHVhbGx5IHVzZXMgdG8gaW50ZXJjZXB0IGNvZGUgdGhhdCBFbGVjdHJvbiBsb2Fkcy5cbiAqXG4gKiBAcGFyYW0gIHtDb21waWxlckhvc3R9IGNvbXBpbGVySG9zdCAgVGhlIGNvbXBpbGVyIGhvc3QgdG8gdXNlIGZvciBjb21waWxhdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluaXRpYWxpemVQcm90b2NvbEhvb2soY29tcGlsZXJIb3N0KSB7XG4gIHByb3RvY29sID0gcHJvdG9jb2wgfHwgcmVxdWlyZSgnZWxlY3Ryb24nKS5wcm90b2NvbDtcblxuICBnbG9iYWxbbWFnaWNHbG9iYWxGb3JSb290Q2FjaGVEaXJdID0gY29tcGlsZXJIb3N0LnJvb3RDYWNoZURpcjtcbiAgZ2xvYmFsW21hZ2ljR2xvYmFsRm9yQXBwUm9vdERpcl0gPSBjb21waWxlckhvc3QuYXBwUm9vdDtcblxuICBjb25zdCBlbGVjdHJvbkNvbXBpbGVTZXR1cENvZGUgPSBgaWYgKHdpbmRvdy5yZXF1aXJlKSByZXF1aXJlKCdlbGVjdHJvbi1jb21waWxlL2xpYi9pbml0aWFsaXplLXJlbmRlcmVyJykuaW5pdGlhbGl6ZVJlbmRlcmVyUHJvY2Vzcygke2NvbXBpbGVySG9zdC5yZWFkT25seU1vZGV9KTtgO1xuXG4gIHByb3RvY29sLmludGVyY2VwdEJ1ZmZlclByb3RvY29sKCdmaWxlJywgYXN5bmMgZnVuY3Rpb24ocmVxdWVzdCwgZmluaXNoKSB7XG4gICAgbGV0IHVyaSA9IHVybC5wYXJzZShyZXF1ZXN0LnVybCk7XG5cbiAgICBkKGBJbnRlcmNlcHRpbmcgdXJsICR7cmVxdWVzdC51cmx9YCk7XG4gICAgaWYgKHJlcXVlc3QudXJsLmluZGV4T2YobWFnaWNXb3JkcykgPiAtMSkge1xuICAgICAgZmluaXNoKHtcbiAgICAgICAgbWltZVR5cGU6ICdhcHBsaWNhdGlvbi9qYXZhc2NyaXB0JyxcbiAgICAgICAgZGF0YTogbmV3IEJ1ZmZlcihlbGVjdHJvbkNvbXBpbGVTZXR1cENvZGUsICd1dGY4JylcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gVGhpcyBpcyBhIHByb3RvY29sLXJlbGF0aXZlIFVSTCB0aGF0IGhhcyBnb25lIHBlYXItc2hhcGVkIGluIEVsZWN0cm9uLFxuICAgIC8vIGxldCdzIHJld3JpdGUgaXRcbiAgICBpZiAodXJpLmhvc3QgJiYgdXJpLmhvc3QubGVuZ3RoID4gMSkge1xuICAgICAgLy9sZXQgbmV3VXJpID0gcmVxdWVzdC51cmwucmVwbGFjZSgvXmZpbGU6LywgXCJodHRwczpcIik7XG4gICAgICAvLyBUT0RPOiBKdW1wIG9mZiB0aGlzIGJyaWRnZSBsYXRlclxuICAgICAgZChgVE9ETzogRm91bmQgYm9ndXMgcHJvdG9jb2wtcmVsYXRpdmUgVVJMLCBjYW4ndCBmaXggaXQgdXAhIWApO1xuICAgICAgZmluaXNoKC0yKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgZmlsZVBhdGggPSBkZWNvZGVVUklDb21wb25lbnQodXJpLnBhdGhuYW1lKTtcblxuICAgIC8vIE5COiBwYXRobmFtZSBoYXMgYSBsZWFkaW5nICcvJyBvbiBXaW4zMiBmb3Igc29tZSByZWFzb25cbiAgICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJykge1xuICAgICAgZmlsZVBhdGggPSBmaWxlUGF0aC5zbGljZSgxKTtcbiAgICB9XG5cbiAgICAvLyBOQjogU3BlY2lhbC1jYXNlIGZpbGVzIGNvbWluZyBmcm9tIGF0b20uYXNhciBvciBub2RlX21vZHVsZXNcbiAgICBpZiAoZmlsZVBhdGgubWF0Y2goL1tcXC9cXFxcXShhdG9tfGVsZWN0cm9uKS5hc2FyLykgfHwgZmlsZVBhdGgubWF0Y2goL1tcXC9cXFxcXShub2RlX21vZHVsZXN8Ym93ZXJfY29tcG9uZW50cykvKSkge1xuICAgICAgLy8gTkJzIG9uIE5CczogSWYgd2UncmUgbG9hZGluZyBhbiBIVE1MIGZpbGUgZnJvbSBub2RlX21vZHVsZXMsIHdlIHN0aWxsIGhhdmVcbiAgICAgIC8vIHRvIGRvIHRoZSBIVE1MIGRvY3VtZW50IHJpZ2dpbmdcbiAgICAgIGlmIChmaWxlUGF0aC5tYXRjaCgvXFwuaHRtbD8kL2kpKSB7XG4gICAgICAgIGxldCByaWdnZWRDb250ZW50cyA9IG51bGw7XG4gICAgICAgIGZzLnJlYWRGaWxlKGZpbGVQYXRoLCAndXRmOCcsIChlcnIsIGNvbnRlbnRzKSA9PiB7XG4gICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgaWYgKGVyci5lcnJubyA9PT0gMzQpIHtcbiAgICAgICAgICAgICAgZmluaXNoKC02KTsgLy8gbmV0OjpFUlJfRklMRV9OT1RfRk9VTkRcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZmluaXNoKC0yKTsgLy8gbmV0OjpGQUlMRURcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIHJpZ2dlZENvbnRlbnRzID0gcmlnSHRtbERvY3VtZW50VG9Jbml0aWFsaXplRWxlY3Ryb25Db21waWxlKGNvbnRlbnRzKTtcbiAgICAgICAgICBmaW5pc2goeyBkYXRhOiBuZXcgQnVmZmVyKHJpZ2dlZENvbnRlbnRzKSwgbWltZVR5cGU6ICd0ZXh0L2h0bWwnIH0pO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICByZXF1ZXN0RmlsZUpvYihmaWxlUGF0aCwgZmluaXNoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBOQjogQ2hyb21pdW0gd2lsbCBzb21laG93IGRlY2lkZSB0aGF0IGV4dGVybmFsIHNvdXJjZSBtYXAgcmVmZXJlbmNlc1xuICAgIC8vIGFyZW4ndCByZWxhdGl2ZSB0byB0aGUgZmlsZSB0aGF0IHdhcyBsb2FkZWQgZm9yIG5vZGUuanMgbW9kdWxlcywgYnV0XG4gICAgLy8gcmVsYXRpdmUgdG8gdGhlIEhUTUwgZmlsZS4gU2luY2Ugd2UgY2FuJ3QgcmVhbGx5IGZpZ3VyZSBvdXQgd2hhdCB0aGVcbiAgICAvLyByZWFsIHBhdGggaXMsIHdlIGp1c3QgbmVlZCB0byBzcXVlbGNoIGl0LlxuICAgIGlmIChmaWxlUGF0aC5tYXRjaCgvXFwubWFwJC9pKSAmJiAhKGF3YWl0IGRvZXNNYXBGaWxlRXhpc3QoZmlsZVBhdGgpKSkge1xuICAgICAgZmluaXNoKHsgZGF0YTogbmV3IEJ1ZmZlcihcIlwiLCAndXRmOCcpLCBtaW1lVHlwZTogJ3RleHQvcGxhaW4nIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgYnlwYXNzQ2hlY2tlciBvZiBieXBhc3NDaGVja2Vycykge1xuICAgICAgaWYgKGJ5cGFzc0NoZWNrZXIoZmlsZVBhdGgpKSB7XG4gICAgICAgIGQoJ2J5cGFzc2luZyBjb21waWxlcnMgZm9yOicsIGZpbGVQYXRoKTtcbiAgICAgICAgcmVxdWVzdEZpbGVKb2IoZmlsZVBhdGgsIGZpbmlzaCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgbGV0IHJlc3VsdCA9IGF3YWl0IGNvbXBpbGVySG9zdC5jb21waWxlKGZpbGVQYXRoKTtcblxuICAgICAgaWYgKHJlc3VsdC5taW1lVHlwZSA9PT0gJ3RleHQvaHRtbCcpIHtcbiAgICAgICAgcmVzdWx0LmNvZGUgPSByaWdIdG1sRG9jdW1lbnRUb0luaXRpYWxpemVFbGVjdHJvbkNvbXBpbGUocmVzdWx0LmNvZGUpO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVzdWx0LmJpbmFyeURhdGEgfHwgcmVzdWx0LmNvZGUgaW5zdGFuY2VvZiBCdWZmZXIpIHtcbiAgICAgICAgZmluaXNoKHsgZGF0YTogcmVzdWx0LmJpbmFyeURhdGEgfHwgcmVzdWx0LmNvZGUsIG1pbWVUeXBlOiByZXN1bHQubWltZVR5cGUgfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZpbmlzaCh7IGRhdGE6IG5ldyBCdWZmZXIocmVzdWx0LmNvZGUpLCBtaW1lVHlwZTogcmVzdWx0Lm1pbWVUeXBlIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgbGV0IGVyciA9IGBGYWlsZWQgdG8gY29tcGlsZSAke2ZpbGVQYXRofTogJHtlLm1lc3NhZ2V9XFxuJHtlLnN0YWNrfWA7XG4gICAgICBkKGVycik7XG5cbiAgICAgIGlmIChlLmVycm5vID09PSAzNCAvKkVOT0VOVCovKSB7XG4gICAgICAgIGZpbmlzaCgtNik7IC8vIG5ldDo6RVJSX0ZJTEVfTk9UX0ZPVU5EXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgZmluaXNoKHsgbWltZVR5cGU6ICd0ZXh0L3BsYWluJywgZGF0YTogbmV3IEJ1ZmZlcihlcnIpIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfSk7XG59XG4iXX0=