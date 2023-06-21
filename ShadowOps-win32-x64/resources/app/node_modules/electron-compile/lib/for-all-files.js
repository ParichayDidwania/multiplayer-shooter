'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.forAllFiles = forAllFiles;
exports.forAllFilesSync = forAllFilesSync;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _promise = require('./promise');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

/**
 * Invokes a method on all files in a directory recursively.
 * 
 * @private
 */
function forAllFiles(rootDirectory, func) {
  for (var _len = arguments.length, args = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
    args[_key - 2] = arguments[_key];
  }

  let rec = (() => {
    var _ref = _asyncToGenerator(function* (dir) {
      let entries = yield _promise.pfs.readdir(dir);

      for (let name of entries) {
        let fullName = _path2.default.join(dir, name);
        let stats = yield _promise.pfs.stat(fullName);

        if (stats.isDirectory()) {
          yield rec(fullName);
        }

        if (stats.isFile()) {
          yield func(fullName, ...args);
        }
      }
    });

    return function rec(_x) {
      return _ref.apply(this, arguments);
    };
  })();

  return rec(rootDirectory);
}

function forAllFilesSync(rootDirectory, func) {
  for (var _len2 = arguments.length, args = Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
    args[_key2 - 2] = arguments[_key2];
  }

  let rec = dir => {
    _fs2.default.readdirSync(dir).forEach(name => {
      let fullName = _path2.default.join(dir, name);
      let stats = _fs2.default.statSync(fullName);

      if (stats.isDirectory()) {
        rec(fullName);
        return;
      }

      if (stats.isFile()) {
        func(fullName, ...args);
        return;
      }
    });
  };

  rec(rootDirectory);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9mb3ItYWxsLWZpbGVzLmpzIl0sIm5hbWVzIjpbImZvckFsbEZpbGVzIiwiZm9yQWxsRmlsZXNTeW5jIiwicm9vdERpcmVjdG9yeSIsImZ1bmMiLCJhcmdzIiwicmVjIiwiZGlyIiwiZW50cmllcyIsInBmcyIsInJlYWRkaXIiLCJuYW1lIiwiZnVsbE5hbWUiLCJwYXRoIiwiam9pbiIsInN0YXRzIiwic3RhdCIsImlzRGlyZWN0b3J5IiwiaXNGaWxlIiwiZnMiLCJyZWFkZGlyU3luYyIsImZvckVhY2giLCJzdGF0U3luYyJdLCJtYXBwaW5ncyI6Ijs7Ozs7UUFVZ0JBLFcsR0FBQUEsVztRQXFCQUMsZSxHQUFBQSxlOztBQS9CaEI7Ozs7QUFDQTs7OztBQUNBOzs7Ozs7QUFHQTs7Ozs7QUFLTyxTQUFTRCxXQUFULENBQXFCRSxhQUFyQixFQUFvQ0MsSUFBcEMsRUFBbUQ7QUFBQSxvQ0FBTkMsSUFBTTtBQUFOQSxRQUFNO0FBQUE7O0FBQ3hELE1BQUlDO0FBQUEsaUNBQU0sV0FBT0MsR0FBUCxFQUFlO0FBQ3ZCLFVBQUlDLFVBQVUsTUFBTUMsYUFBSUMsT0FBSixDQUFZSCxHQUFaLENBQXBCOztBQUVBLFdBQUssSUFBSUksSUFBVCxJQUFpQkgsT0FBakIsRUFBMEI7QUFDeEIsWUFBSUksV0FBV0MsZUFBS0MsSUFBTCxDQUFVUCxHQUFWLEVBQWVJLElBQWYsQ0FBZjtBQUNBLFlBQUlJLFFBQVEsTUFBTU4sYUFBSU8sSUFBSixDQUFTSixRQUFULENBQWxCOztBQUVBLFlBQUlHLE1BQU1FLFdBQU4sRUFBSixFQUF5QjtBQUN2QixnQkFBTVgsSUFBSU0sUUFBSixDQUFOO0FBQ0Q7O0FBRUQsWUFBSUcsTUFBTUcsTUFBTixFQUFKLEVBQW9CO0FBQ2xCLGdCQUFNZCxLQUFLUSxRQUFMLEVBQWUsR0FBR1AsSUFBbEIsQ0FBTjtBQUNEO0FBQ0Y7QUFDRixLQWZHOztBQUFBO0FBQUE7QUFBQTtBQUFBLE1BQUo7O0FBaUJBLFNBQU9DLElBQUlILGFBQUosQ0FBUDtBQUNEOztBQUVNLFNBQVNELGVBQVQsQ0FBeUJDLGFBQXpCLEVBQXdDQyxJQUF4QyxFQUF1RDtBQUFBLHFDQUFOQyxJQUFNO0FBQU5BLFFBQU07QUFBQTs7QUFDNUQsTUFBSUMsTUFBT0MsR0FBRCxJQUFTO0FBQ2pCWSxpQkFBR0MsV0FBSCxDQUFlYixHQUFmLEVBQW9CYyxPQUFwQixDQUE2QlYsSUFBRCxJQUFVO0FBQ3BDLFVBQUlDLFdBQVdDLGVBQUtDLElBQUwsQ0FBVVAsR0FBVixFQUFlSSxJQUFmLENBQWY7QUFDQSxVQUFJSSxRQUFRSSxhQUFHRyxRQUFILENBQVlWLFFBQVosQ0FBWjs7QUFFQSxVQUFJRyxNQUFNRSxXQUFOLEVBQUosRUFBeUI7QUFDdkJYLFlBQUlNLFFBQUo7QUFDQTtBQUNEOztBQUVELFVBQUlHLE1BQU1HLE1BQU4sRUFBSixFQUFvQjtBQUNsQmQsYUFBS1EsUUFBTCxFQUFlLEdBQUdQLElBQWxCO0FBQ0E7QUFDRDtBQUNGLEtBYkQ7QUFjRCxHQWZEOztBQWlCQUMsTUFBSUgsYUFBSjtBQUNEIiwiZmlsZSI6ImZvci1hbGwtZmlsZXMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge3Bmc30gZnJvbSAnLi9wcm9taXNlJztcblxuXG4vKipcbiAqIEludm9rZXMgYSBtZXRob2Qgb24gYWxsIGZpbGVzIGluIGEgZGlyZWN0b3J5IHJlY3Vyc2l2ZWx5LlxuICogXG4gKiBAcHJpdmF0ZVxuICovIFxuZXhwb3J0IGZ1bmN0aW9uIGZvckFsbEZpbGVzKHJvb3REaXJlY3RvcnksIGZ1bmMsIC4uLmFyZ3MpIHtcbiAgbGV0IHJlYyA9IGFzeW5jIChkaXIpID0+IHtcbiAgICBsZXQgZW50cmllcyA9IGF3YWl0IHBmcy5yZWFkZGlyKGRpcik7XG4gICAgXG4gICAgZm9yIChsZXQgbmFtZSBvZiBlbnRyaWVzKSB7XG4gICAgICBsZXQgZnVsbE5hbWUgPSBwYXRoLmpvaW4oZGlyLCBuYW1lKTtcbiAgICAgIGxldCBzdGF0cyA9IGF3YWl0IHBmcy5zdGF0KGZ1bGxOYW1lKTtcblxuICAgICAgaWYgKHN0YXRzLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgYXdhaXQgcmVjKGZ1bGxOYW1lKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHN0YXRzLmlzRmlsZSgpKSB7XG4gICAgICAgIGF3YWl0IGZ1bmMoZnVsbE5hbWUsIC4uLmFyZ3MpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICByZXR1cm4gcmVjKHJvb3REaXJlY3RvcnkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9yQWxsRmlsZXNTeW5jKHJvb3REaXJlY3RvcnksIGZ1bmMsIC4uLmFyZ3MpIHtcbiAgbGV0IHJlYyA9IChkaXIpID0+IHtcbiAgICBmcy5yZWFkZGlyU3luYyhkaXIpLmZvckVhY2goKG5hbWUpID0+IHtcbiAgICAgIGxldCBmdWxsTmFtZSA9IHBhdGguam9pbihkaXIsIG5hbWUpO1xuICAgICAgbGV0IHN0YXRzID0gZnMuc3RhdFN5bmMoZnVsbE5hbWUpO1xuICAgICAgXG4gICAgICBpZiAoc3RhdHMuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICByZWMoZnVsbE5hbWUpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmIChzdGF0cy5pc0ZpbGUoKSkge1xuICAgICAgICBmdW5jKGZ1bGxOYW1lLCAuLi5hcmdzKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuICBcbiAgcmVjKHJvb3REaXJlY3RvcnkpO1xufVxuIl19