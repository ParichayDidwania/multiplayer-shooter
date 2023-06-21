'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.watchPathDirect = watchPathDirect;
exports.watchPath = watchPath;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _Observable = require('rxjs/Observable');

var _Subscription = require('rxjs/Subscription');

var _lruCache = require('lru-cache');

var _lruCache2 = _interopRequireDefault(_lruCache);

require('rxjs/add/operator/publish');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function watchPathDirect(directory) {
  return _Observable.Observable.create(subj => {
    let dead = false;

    const watcher = _fs2.default.watch(directory, {}, (eventType, fileName) => {
      if (dead) return;
      subj.next({ eventType, fileName });
    });

    watcher.on('error', e => {
      dead = true;
      subj.error(e);
    });

    return new _Subscription.Subscription(() => {
      if (!dead) {
        watcher.close();
      }
    });
  });
}

const pathCache = new _lruCache2.default({ length: 256 });
function watchPath(directory) {
  let ret = pathCache.get(directory);
  if (ret) return ret;

  ret = watchPathDirect(directory).publish().refCount();
  pathCache.set(directory, ret);
  return ret;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9wYXRod2F0Y2hlci1yeC5qcyJdLCJuYW1lcyI6WyJ3YXRjaFBhdGhEaXJlY3QiLCJ3YXRjaFBhdGgiLCJkaXJlY3RvcnkiLCJPYnNlcnZhYmxlIiwiY3JlYXRlIiwic3ViaiIsImRlYWQiLCJ3YXRjaGVyIiwiZnMiLCJ3YXRjaCIsImV2ZW50VHlwZSIsImZpbGVOYW1lIiwibmV4dCIsIm9uIiwiZSIsImVycm9yIiwiU3Vic2NyaXB0aW9uIiwiY2xvc2UiLCJwYXRoQ2FjaGUiLCJMUlUiLCJsZW5ndGgiLCJyZXQiLCJnZXQiLCJwdWJsaXNoIiwicmVmQ291bnQiLCJzZXQiXSwibWFwcGluZ3MiOiI7Ozs7O1FBT2dCQSxlLEdBQUFBLGU7UUFtQkFDLFMsR0FBQUEsUzs7QUExQmhCOzs7O0FBQ0E7O0FBQ0E7O0FBQ0E7Ozs7QUFFQTs7OztBQUVPLFNBQVNELGVBQVQsQ0FBeUJFLFNBQXpCLEVBQW9DO0FBQ3pDLFNBQU9DLHVCQUFXQyxNQUFYLENBQW1CQyxJQUFELElBQVU7QUFDakMsUUFBSUMsT0FBTyxLQUFYOztBQUVBLFVBQU1DLFVBQVVDLGFBQUdDLEtBQUgsQ0FBU1AsU0FBVCxFQUFvQixFQUFwQixFQUF3QixDQUFDUSxTQUFELEVBQVlDLFFBQVosS0FBeUI7QUFDL0QsVUFBSUwsSUFBSixFQUFVO0FBQ1ZELFdBQUtPLElBQUwsQ0FBVSxFQUFDRixTQUFELEVBQVlDLFFBQVosRUFBVjtBQUNELEtBSGUsQ0FBaEI7O0FBS0FKLFlBQVFNLEVBQVIsQ0FBVyxPQUFYLEVBQXFCQyxDQUFELElBQU87QUFDekJSLGFBQU8sSUFBUDtBQUNBRCxXQUFLVSxLQUFMLENBQVdELENBQVg7QUFDRCxLQUhEOztBQUtBLFdBQU8sSUFBSUUsMEJBQUosQ0FBaUIsTUFBTTtBQUFFLFVBQUksQ0FBQ1YsSUFBTCxFQUFXO0FBQUVDLGdCQUFRVSxLQUFSO0FBQWtCO0FBQUUsS0FBMUQsQ0FBUDtBQUNELEdBZE0sQ0FBUDtBQWVEOztBQUVELE1BQU1DLFlBQVksSUFBSUMsa0JBQUosQ0FBUSxFQUFFQyxRQUFRLEdBQVYsRUFBUixDQUFsQjtBQUNPLFNBQVNuQixTQUFULENBQW1CQyxTQUFuQixFQUE4QjtBQUNuQyxNQUFJbUIsTUFBTUgsVUFBVUksR0FBVixDQUFjcEIsU0FBZCxDQUFWO0FBQ0EsTUFBSW1CLEdBQUosRUFBUyxPQUFPQSxHQUFQOztBQUVUQSxRQUFNckIsZ0JBQWdCRSxTQUFoQixFQUEyQnFCLE9BQTNCLEdBQXFDQyxRQUFyQyxFQUFOO0FBQ0FOLFlBQVVPLEdBQVYsQ0FBY3ZCLFNBQWQsRUFBeUJtQixHQUF6QjtBQUNBLFNBQU9BLEdBQVA7QUFDRCIsImZpbGUiOiJwYXRod2F0Y2hlci1yeC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQge09ic2VydmFibGV9IGZyb20gJ3J4anMvT2JzZXJ2YWJsZSc7XG5pbXBvcnQge1N1YnNjcmlwdGlvbn0gZnJvbSAncnhqcy9TdWJzY3JpcHRpb24nO1xuaW1wb3J0IExSVSBmcm9tICdscnUtY2FjaGUnO1xuXG5pbXBvcnQgJ3J4anMvYWRkL29wZXJhdG9yL3B1Ymxpc2gnO1xuXG5leHBvcnQgZnVuY3Rpb24gd2F0Y2hQYXRoRGlyZWN0KGRpcmVjdG9yeSkge1xuICByZXR1cm4gT2JzZXJ2YWJsZS5jcmVhdGUoKHN1YmopID0+IHtcbiAgICBsZXQgZGVhZCA9IGZhbHNlO1xuXG4gICAgY29uc3Qgd2F0Y2hlciA9IGZzLndhdGNoKGRpcmVjdG9yeSwge30sIChldmVudFR5cGUsIGZpbGVOYW1lKSA9PiB7XG4gICAgICBpZiAoZGVhZCkgcmV0dXJuO1xuICAgICAgc3Viai5uZXh0KHtldmVudFR5cGUsIGZpbGVOYW1lfSk7XG4gICAgfSk7XG5cbiAgICB3YXRjaGVyLm9uKCdlcnJvcicsIChlKSA9PiB7XG4gICAgICBkZWFkID0gdHJ1ZTtcbiAgICAgIHN1YmouZXJyb3IoZSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbmV3IFN1YnNjcmlwdGlvbigoKSA9PiB7IGlmICghZGVhZCkgeyB3YXRjaGVyLmNsb3NlKCk7IH0gfSk7XG4gIH0pO1xufVxuXG5jb25zdCBwYXRoQ2FjaGUgPSBuZXcgTFJVKHsgbGVuZ3RoOiAyNTYgfSk7XG5leHBvcnQgZnVuY3Rpb24gd2F0Y2hQYXRoKGRpcmVjdG9yeSkge1xuICBsZXQgcmV0ID0gcGF0aENhY2hlLmdldChkaXJlY3RvcnkpO1xuICBpZiAocmV0KSByZXR1cm4gcmV0O1xuXG4gIHJldCA9IHdhdGNoUGF0aERpcmVjdChkaXJlY3RvcnkpLnB1Ymxpc2goKS5yZWZDb3VudCgpO1xuICBwYXRoQ2FjaGUuc2V0KGRpcmVjdG9yeSwgcmV0KTtcbiAgcmV0dXJuIHJldDtcbn1cbiJdfQ==