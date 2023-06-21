'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = sanitizeFilePath;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _lruCache = require('lru-cache');

var _lruCache2 = _interopRequireDefault(_lruCache);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const d = require('debug')('electron-compile:sanitize-paths');
const realpathCache = (0, _lruCache2.default)({ max: 1024 });

function cachedRealpath(p) {
  let ret = realpathCache.get(p);
  if (ret) return ret;

  ret = _fs2.default.realpathSync(p);
  d(`Cache miss for cachedRealpath: '${p}' => '${ret}'`);

  realpathCache.set(p, ret);
  return ret;
}

/**
 * Electron will sometimes hand us paths that don't match the platform if they
 * were derived from a URL (i.e. 'C:/Users/Paul/...'), whereas the cache will have
 * saved paths with backslashes.
 *
 * @private
 */
function sanitizeFilePath(file) {
  if (!file) return file;

  // NB: Some people add symlinks into system directories. node.js will internally
  // call realpath on paths that it finds, which will break our cache resolution.
  // We need to catch this scenario and fix it up. The tricky part is, some parts
  // of Electron will give us the pre-resolved paths, and others will give us the
  // post-resolved one. We need to handle both.

  let realFile = null;
  let parts = file.split(/[\\\/]app.asar[\\\/]/);
  if (!parts[1]) {
    // Not using an ASAR archive
    realFile = cachedRealpath(file);
  } else {
    // We do all this silliness to work around
    // https://github.com/atom/electron/issues/4610
    realFile = `${cachedRealpath(parts[0])}/app.asar/${parts[1]}`;
  }

  return realFile.replace(/[\\\/]/g, '/');
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9zYW5pdGl6ZS1wYXRocy5qcyJdLCJuYW1lcyI6WyJzYW5pdGl6ZUZpbGVQYXRoIiwiZCIsInJlcXVpcmUiLCJyZWFscGF0aENhY2hlIiwibWF4IiwiY2FjaGVkUmVhbHBhdGgiLCJwIiwicmV0IiwiZ2V0IiwiZnMiLCJyZWFscGF0aFN5bmMiLCJzZXQiLCJmaWxlIiwicmVhbEZpbGUiLCJwYXJ0cyIsInNwbGl0IiwicmVwbGFjZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7a0JBd0J3QkEsZ0I7O0FBeEJ4Qjs7OztBQUNBOzs7Ozs7QUFFQSxNQUFNQyxJQUFJQyxRQUFRLE9BQVIsRUFBaUIsaUNBQWpCLENBQVY7QUFDQSxNQUFNQyxnQkFBZ0Isd0JBQVMsRUFBRUMsS0FBSyxJQUFQLEVBQVQsQ0FBdEI7O0FBRUEsU0FBU0MsY0FBVCxDQUF3QkMsQ0FBeEIsRUFBMkI7QUFDekIsTUFBSUMsTUFBTUosY0FBY0ssR0FBZCxDQUFrQkYsQ0FBbEIsQ0FBVjtBQUNBLE1BQUlDLEdBQUosRUFBUyxPQUFPQSxHQUFQOztBQUVUQSxRQUFNRSxhQUFHQyxZQUFILENBQWdCSixDQUFoQixDQUFOO0FBQ0FMLElBQUcsbUNBQWtDSyxDQUFFLFNBQVFDLEdBQUksR0FBbkQ7O0FBRUFKLGdCQUFjUSxHQUFkLENBQWtCTCxDQUFsQixFQUFxQkMsR0FBckI7QUFDQSxTQUFPQSxHQUFQO0FBQ0Q7O0FBRUQ7Ozs7Ozs7QUFPZSxTQUFTUCxnQkFBVCxDQUEwQlksSUFBMUIsRUFBZ0M7QUFDN0MsTUFBSSxDQUFDQSxJQUFMLEVBQVcsT0FBT0EsSUFBUDs7QUFFWDtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLE1BQUlDLFdBQVcsSUFBZjtBQUNBLE1BQUlDLFFBQVFGLEtBQUtHLEtBQUwsQ0FBVyxzQkFBWCxDQUFaO0FBQ0EsTUFBSSxDQUFDRCxNQUFNLENBQU4sQ0FBTCxFQUFlO0FBQ2I7QUFDQUQsZUFBV1IsZUFBZU8sSUFBZixDQUFYO0FBQ0QsR0FIRCxNQUdPO0FBQ0w7QUFDQTtBQUNBQyxlQUFZLEdBQUVSLGVBQWVTLE1BQU0sQ0FBTixDQUFmLENBQXlCLGFBQVlBLE1BQU0sQ0FBTixDQUFTLEVBQTVEO0FBQ0Q7O0FBRUQsU0FBT0QsU0FBU0csT0FBVCxDQUFpQixTQUFqQixFQUE0QixHQUE1QixDQUFQO0FBQ0QiLCJmaWxlIjoic2FuaXRpemUtcGF0aHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IExSVUNhY2hlIGZyb20gJ2xydS1jYWNoZSc7XG5cbmNvbnN0IGQgPSByZXF1aXJlKCdkZWJ1ZycpKCdlbGVjdHJvbi1jb21waWxlOnNhbml0aXplLXBhdGhzJyk7XG5jb25zdCByZWFscGF0aENhY2hlID0gTFJVQ2FjaGUoeyBtYXg6IDEwMjQgfSk7XG5cbmZ1bmN0aW9uIGNhY2hlZFJlYWxwYXRoKHApIHtcbiAgbGV0IHJldCA9IHJlYWxwYXRoQ2FjaGUuZ2V0KHApO1xuICBpZiAocmV0KSByZXR1cm4gcmV0O1xuXG4gIHJldCA9IGZzLnJlYWxwYXRoU3luYyhwKTtcbiAgZChgQ2FjaGUgbWlzcyBmb3IgY2FjaGVkUmVhbHBhdGg6ICcke3B9JyA9PiAnJHtyZXR9J2ApO1xuXG4gIHJlYWxwYXRoQ2FjaGUuc2V0KHAsIHJldCk7XG4gIHJldHVybiByZXQ7XG59XG5cbi8qKlxuICogRWxlY3Ryb24gd2lsbCBzb21ldGltZXMgaGFuZCB1cyBwYXRocyB0aGF0IGRvbid0IG1hdGNoIHRoZSBwbGF0Zm9ybSBpZiB0aGV5XG4gKiB3ZXJlIGRlcml2ZWQgZnJvbSBhIFVSTCAoaS5lLiAnQzovVXNlcnMvUGF1bC8uLi4nKSwgd2hlcmVhcyB0aGUgY2FjaGUgd2lsbCBoYXZlXG4gKiBzYXZlZCBwYXRocyB3aXRoIGJhY2tzbGFzaGVzLlxuICpcbiAqIEBwcml2YXRlXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHNhbml0aXplRmlsZVBhdGgoZmlsZSkge1xuICBpZiAoIWZpbGUpIHJldHVybiBmaWxlO1xuXG4gIC8vIE5COiBTb21lIHBlb3BsZSBhZGQgc3ltbGlua3MgaW50byBzeXN0ZW0gZGlyZWN0b3JpZXMuIG5vZGUuanMgd2lsbCBpbnRlcm5hbGx5XG4gIC8vIGNhbGwgcmVhbHBhdGggb24gcGF0aHMgdGhhdCBpdCBmaW5kcywgd2hpY2ggd2lsbCBicmVhayBvdXIgY2FjaGUgcmVzb2x1dGlvbi5cbiAgLy8gV2UgbmVlZCB0byBjYXRjaCB0aGlzIHNjZW5hcmlvIGFuZCBmaXggaXQgdXAuIFRoZSB0cmlja3kgcGFydCBpcywgc29tZSBwYXJ0c1xuICAvLyBvZiBFbGVjdHJvbiB3aWxsIGdpdmUgdXMgdGhlIHByZS1yZXNvbHZlZCBwYXRocywgYW5kIG90aGVycyB3aWxsIGdpdmUgdXMgdGhlXG4gIC8vIHBvc3QtcmVzb2x2ZWQgb25lLiBXZSBuZWVkIHRvIGhhbmRsZSBib3RoLlxuXG4gIGxldCByZWFsRmlsZSA9IG51bGw7XG4gIGxldCBwYXJ0cyA9IGZpbGUuc3BsaXQoL1tcXFxcXFwvXWFwcC5hc2FyW1xcXFxcXC9dLyk7XG4gIGlmICghcGFydHNbMV0pIHtcbiAgICAvLyBOb3QgdXNpbmcgYW4gQVNBUiBhcmNoaXZlXG4gICAgcmVhbEZpbGUgPSBjYWNoZWRSZWFscGF0aChmaWxlKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBXZSBkbyBhbGwgdGhpcyBzaWxsaW5lc3MgdG8gd29yayBhcm91bmRcbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vYXRvbS9lbGVjdHJvbi9pc3N1ZXMvNDYxMFxuICAgIHJlYWxGaWxlID0gYCR7Y2FjaGVkUmVhbHBhdGgocGFydHNbMF0pfS9hcHAuYXNhci8ke3BhcnRzWzFdfWA7XG4gIH1cblxuICByZXR1cm4gcmVhbEZpbGUucmVwbGFjZSgvW1xcXFxcXC9dL2csICcvJyk7XG59XG4iXX0=