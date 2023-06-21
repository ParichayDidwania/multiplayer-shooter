'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.send = send;
exports.listen = listen;

var _Observable = require('rxjs/Observable');

var _Subject = require('rxjs/Subject');

require('rxjs/add/observable/throw');

const isElectron = 'type' in process;
const isBrowser = process.type === 'browser';

const ipc = !isElectron ? null : isBrowser ? require('electron').ipcMain : require('electron').ipcRenderer;

const channelList = {};

function send(channel) {
  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  if (isElectron && !isBrowser) {
    ipc.send(channel, ...args);
    return;
  }

  if (!(channel in channelList)) return;

  let subj = channelList[channel].subj;

  subj.next(args);
}

function listen(channel) {
  if (isElectron && !isBrowser) return _Observable.Observable.throw(new Error("Can only call listen from browser"));

  return _Observable.Observable.create(s => {
    if (!(channel in channelList)) {
      let subj = new _Subject.Subject();
      let ipcListener = function (e) {
        for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
          args[_key2 - 1] = arguments[_key2];
        }

        subj.next(args);
      };

      channelList[channel] = { subj, refcount: 0 };
      if (isElectron && isBrowser) {
        ipc.on(channel, ipcListener);
        channelList[channel].listener = ipcListener;
      }
    }

    channelList[channel].refcount++;

    let disp = channelList[channel].subj.subscribe(s);
    disp.add(() => {
      channelList[channel].refcount--;
      if (channelList[channel].refcount > 0) return;

      if (channelList[channel].listener) {
        ipc.removeListener(channel, channelList[channel].listener);
      }

      delete channelList.channel;
    });

    return disp;
  });
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9icm93c2VyLXNpZ25hbC5qcyJdLCJuYW1lcyI6WyJzZW5kIiwibGlzdGVuIiwiaXNFbGVjdHJvbiIsInByb2Nlc3MiLCJpc0Jyb3dzZXIiLCJ0eXBlIiwiaXBjIiwicmVxdWlyZSIsImlwY01haW4iLCJpcGNSZW5kZXJlciIsImNoYW5uZWxMaXN0IiwiY2hhbm5lbCIsImFyZ3MiLCJzdWJqIiwibmV4dCIsIk9ic2VydmFibGUiLCJ0aHJvdyIsIkVycm9yIiwiY3JlYXRlIiwicyIsIlN1YmplY3QiLCJpcGNMaXN0ZW5lciIsImUiLCJyZWZjb3VudCIsIm9uIiwibGlzdGVuZXIiLCJkaXNwIiwic3Vic2NyaWJlIiwiYWRkIiwicmVtb3ZlTGlzdGVuZXIiXSwibWFwcGluZ3MiOiI7Ozs7O1FBYWdCQSxJLEdBQUFBLEk7UUFZQUMsTSxHQUFBQSxNOztBQXpCaEI7O0FBQ0E7O0FBRUE7O0FBRUEsTUFBTUMsYUFBYSxVQUFVQyxPQUE3QjtBQUNBLE1BQU1DLFlBQVlELFFBQVFFLElBQVIsS0FBaUIsU0FBbkM7O0FBRUEsTUFBTUMsTUFBTSxDQUFDSixVQUFELEdBQWMsSUFBZCxHQUNWRSxZQUFZRyxRQUFRLFVBQVIsRUFBb0JDLE9BQWhDLEdBQTBDRCxRQUFRLFVBQVIsRUFBb0JFLFdBRGhFOztBQUdBLE1BQU1DLGNBQWMsRUFBcEI7O0FBRU8sU0FBU1YsSUFBVCxDQUFjVyxPQUFkLEVBQWdDO0FBQUEsb0NBQU5DLElBQU07QUFBTkEsUUFBTTtBQUFBOztBQUNyQyxNQUFJVixjQUFjLENBQUNFLFNBQW5CLEVBQThCO0FBQzVCRSxRQUFJTixJQUFKLENBQVNXLE9BQVQsRUFBa0IsR0FBR0MsSUFBckI7QUFDQTtBQUNEOztBQUVELE1BQUksRUFBRUQsV0FBV0QsV0FBYixDQUFKLEVBQStCOztBQU5NLE1BUS9CRyxJQVIrQixHQVF0QkgsWUFBWUMsT0FBWixDQVJzQixDQVEvQkUsSUFSK0I7O0FBU3JDQSxPQUFLQyxJQUFMLENBQVVGLElBQVY7QUFDRDs7QUFFTSxTQUFTWCxNQUFULENBQWdCVSxPQUFoQixFQUF5QjtBQUM5QixNQUFJVCxjQUFjLENBQUNFLFNBQW5CLEVBQThCLE9BQU9XLHVCQUFXQyxLQUFYLENBQWlCLElBQUlDLEtBQUosQ0FBVSxtQ0FBVixDQUFqQixDQUFQOztBQUU5QixTQUFPRix1QkFBV0csTUFBWCxDQUFtQkMsQ0FBRCxJQUFPO0FBQzlCLFFBQUksRUFBRVIsV0FBV0QsV0FBYixDQUFKLEVBQStCO0FBQzdCLFVBQUlHLE9BQU8sSUFBSU8sZ0JBQUosRUFBWDtBQUNBLFVBQUlDLGNBQWMsVUFBQ0MsQ0FBRCxFQUFnQjtBQUFBLDJDQUFUVixJQUFTO0FBQVRBLGNBQVM7QUFBQTs7QUFBRUMsYUFBS0MsSUFBTCxDQUFVRixJQUFWO0FBQWtCLE9BQXREOztBQUVBRixrQkFBWUMsT0FBWixJQUF1QixFQUFFRSxJQUFGLEVBQVFVLFVBQVUsQ0FBbEIsRUFBdkI7QUFDQSxVQUFJckIsY0FBY0UsU0FBbEIsRUFBNkI7QUFDM0JFLFlBQUlrQixFQUFKLENBQU9iLE9BQVAsRUFBZ0JVLFdBQWhCO0FBQ0FYLG9CQUFZQyxPQUFaLEVBQXFCYyxRQUFyQixHQUFnQ0osV0FBaEM7QUFDRDtBQUNGOztBQUVEWCxnQkFBWUMsT0FBWixFQUFxQlksUUFBckI7O0FBRUEsUUFBSUcsT0FBT2hCLFlBQVlDLE9BQVosRUFBcUJFLElBQXJCLENBQTBCYyxTQUExQixDQUFvQ1IsQ0FBcEMsQ0FBWDtBQUNBTyxTQUFLRSxHQUFMLENBQVMsTUFBTTtBQUNibEIsa0JBQVlDLE9BQVosRUFBcUJZLFFBQXJCO0FBQ0EsVUFBSWIsWUFBWUMsT0FBWixFQUFxQlksUUFBckIsR0FBZ0MsQ0FBcEMsRUFBdUM7O0FBRXZDLFVBQUliLFlBQVlDLE9BQVosRUFBcUJjLFFBQXpCLEVBQW1DO0FBQ2pDbkIsWUFBSXVCLGNBQUosQ0FBbUJsQixPQUFuQixFQUE0QkQsWUFBWUMsT0FBWixFQUFxQmMsUUFBakQ7QUFDRDs7QUFFRCxhQUFPZixZQUFZQyxPQUFuQjtBQUNELEtBVEQ7O0FBV0EsV0FBT2UsSUFBUDtBQUNELEdBM0JNLENBQVA7QUE0QkQiLCJmaWxlIjoiYnJvd3Nlci1zaWduYWwuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge09ic2VydmFibGV9IGZyb20gJ3J4anMvT2JzZXJ2YWJsZSc7XG5pbXBvcnQge1N1YmplY3R9IGZyb20gJ3J4anMvU3ViamVjdCc7XG5cbmltcG9ydCAncnhqcy9hZGQvb2JzZXJ2YWJsZS90aHJvdyc7XG5cbmNvbnN0IGlzRWxlY3Ryb24gPSAndHlwZScgaW4gcHJvY2VzcztcbmNvbnN0IGlzQnJvd3NlciA9IHByb2Nlc3MudHlwZSA9PT0gJ2Jyb3dzZXInO1xuXG5jb25zdCBpcGMgPSAhaXNFbGVjdHJvbiA/IG51bGwgOlxuICBpc0Jyb3dzZXIgPyByZXF1aXJlKCdlbGVjdHJvbicpLmlwY01haW4gOiByZXF1aXJlKCdlbGVjdHJvbicpLmlwY1JlbmRlcmVyO1xuXG5jb25zdCBjaGFubmVsTGlzdCA9IHt9O1xuXG5leHBvcnQgZnVuY3Rpb24gc2VuZChjaGFubmVsLCAuLi5hcmdzKSB7XG4gIGlmIChpc0VsZWN0cm9uICYmICFpc0Jyb3dzZXIpIHtcbiAgICBpcGMuc2VuZChjaGFubmVsLCAuLi5hcmdzKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAoIShjaGFubmVsIGluIGNoYW5uZWxMaXN0KSkgcmV0dXJuO1xuXG4gIGxldCB7IHN1YmogfSA9IGNoYW5uZWxMaXN0W2NoYW5uZWxdO1xuICBzdWJqLm5leHQoYXJncyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0ZW4oY2hhbm5lbCkge1xuICBpZiAoaXNFbGVjdHJvbiAmJiAhaXNCcm93c2VyKSByZXR1cm4gT2JzZXJ2YWJsZS50aHJvdyhuZXcgRXJyb3IoXCJDYW4gb25seSBjYWxsIGxpc3RlbiBmcm9tIGJyb3dzZXJcIikpO1xuXG4gIHJldHVybiBPYnNlcnZhYmxlLmNyZWF0ZSgocykgPT4ge1xuICAgIGlmICghKGNoYW5uZWwgaW4gY2hhbm5lbExpc3QpKSB7XG4gICAgICBsZXQgc3ViaiA9IG5ldyBTdWJqZWN0KCk7XG4gICAgICBsZXQgaXBjTGlzdGVuZXIgPSAoZSwgLi4uYXJncykgPT4geyBzdWJqLm5leHQoYXJncyk7IH07XG5cbiAgICAgIGNoYW5uZWxMaXN0W2NoYW5uZWxdID0geyBzdWJqLCByZWZjb3VudDogMCB9O1xuICAgICAgaWYgKGlzRWxlY3Ryb24gJiYgaXNCcm93c2VyKSB7XG4gICAgICAgIGlwYy5vbihjaGFubmVsLCBpcGNMaXN0ZW5lcik7XG4gICAgICAgIGNoYW5uZWxMaXN0W2NoYW5uZWxdLmxpc3RlbmVyID0gaXBjTGlzdGVuZXI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY2hhbm5lbExpc3RbY2hhbm5lbF0ucmVmY291bnQrKztcblxuICAgIGxldCBkaXNwID0gY2hhbm5lbExpc3RbY2hhbm5lbF0uc3Viai5zdWJzY3JpYmUocyk7XG4gICAgZGlzcC5hZGQoKCkgPT4ge1xuICAgICAgY2hhbm5lbExpc3RbY2hhbm5lbF0ucmVmY291bnQtLTtcbiAgICAgIGlmIChjaGFubmVsTGlzdFtjaGFubmVsXS5yZWZjb3VudCA+IDApIHJldHVybjtcblxuICAgICAgaWYgKGNoYW5uZWxMaXN0W2NoYW5uZWxdLmxpc3RlbmVyKSB7XG4gICAgICAgIGlwYy5yZW1vdmVMaXN0ZW5lcihjaGFubmVsLCBjaGFubmVsTGlzdFtjaGFubmVsXS5saXN0ZW5lcik7XG4gICAgICB9XG5cbiAgICAgIGRlbGV0ZSBjaGFubmVsTGlzdC5jaGFubmVsO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGRpc3A7XG4gIH0pO1xufVxuIl19