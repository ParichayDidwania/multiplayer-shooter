'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function requireModule(href) {
  let filePath = href;

  if (filePath.match(/^file:/i)) {
    let theUrl = _url2.default.parse(filePath);
    filePath = decodeURIComponent(theUrl.pathname);

    if (process.platform === 'win32') {
      filePath = filePath.slice(1);
    }
  }

  // NB: We don't do any path canonicalization here because we rely on
  // InlineHtmlCompiler to have already converted any relative paths that
  // were used with x-require into absolute paths.
  require(filePath);
}

/**
 * @private
 */

exports.default = (() => {
  if (process.type !== 'renderer' || !window || !window.document) return null;

  let proto = Object.assign(Object.create(HTMLElement.prototype), {
    createdCallback: function () {
      let href = this.getAttribute('src');
      if (href && href.length > 0) {
        requireModule(href);
      }
    },
    attributeChangedCallback: function (attrName, oldVal, newVal) {
      if (attrName !== 'src') return;
      requireModule(newVal);
    }
  });

  return document.registerElement('x-require', { prototype: proto });
})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy94LXJlcXVpcmUuanMiXSwibmFtZXMiOlsicmVxdWlyZU1vZHVsZSIsImhyZWYiLCJmaWxlUGF0aCIsIm1hdGNoIiwidGhlVXJsIiwidXJsIiwicGFyc2UiLCJkZWNvZGVVUklDb21wb25lbnQiLCJwYXRobmFtZSIsInByb2Nlc3MiLCJwbGF0Zm9ybSIsInNsaWNlIiwicmVxdWlyZSIsInR5cGUiLCJ3aW5kb3ciLCJkb2N1bWVudCIsInByb3RvIiwiT2JqZWN0IiwiYXNzaWduIiwiY3JlYXRlIiwiSFRNTEVsZW1lbnQiLCJwcm90b3R5cGUiLCJjcmVhdGVkQ2FsbGJhY2siLCJnZXRBdHRyaWJ1dGUiLCJsZW5ndGgiLCJhdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2siLCJhdHRyTmFtZSIsIm9sZFZhbCIsIm5ld1ZhbCIsInJlZ2lzdGVyRWxlbWVudCJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7Ozs7OztBQUVBLFNBQVNBLGFBQVQsQ0FBdUJDLElBQXZCLEVBQTZCO0FBQzNCLE1BQUlDLFdBQVdELElBQWY7O0FBRUEsTUFBSUMsU0FBU0MsS0FBVCxDQUFlLFNBQWYsQ0FBSixFQUErQjtBQUM3QixRQUFJQyxTQUFTQyxjQUFJQyxLQUFKLENBQVVKLFFBQVYsQ0FBYjtBQUNBQSxlQUFXSyxtQkFBbUJILE9BQU9JLFFBQTFCLENBQVg7O0FBRUEsUUFBSUMsUUFBUUMsUUFBUixLQUFxQixPQUF6QixFQUFrQztBQUNoQ1IsaUJBQVdBLFNBQVNTLEtBQVQsQ0FBZSxDQUFmLENBQVg7QUFDRDtBQUNGOztBQUVEO0FBQ0E7QUFDQTtBQUNBQyxVQUFRVixRQUFSO0FBQ0Q7O0FBRUQ7Ozs7a0JBR2UsQ0FBQyxNQUFNO0FBQ3BCLE1BQUlPLFFBQVFJLElBQVIsS0FBaUIsVUFBakIsSUFBK0IsQ0FBQ0MsTUFBaEMsSUFBMEMsQ0FBQ0EsT0FBT0MsUUFBdEQsRUFBZ0UsT0FBTyxJQUFQOztBQUVoRSxNQUFJQyxRQUFRQyxPQUFPQyxNQUFQLENBQWNELE9BQU9FLE1BQVAsQ0FBY0MsWUFBWUMsU0FBMUIsQ0FBZCxFQUFvRDtBQUM5REMscUJBQWlCLFlBQVc7QUFDMUIsVUFBSXJCLE9BQU8sS0FBS3NCLFlBQUwsQ0FBa0IsS0FBbEIsQ0FBWDtBQUNBLFVBQUl0QixRQUFRQSxLQUFLdUIsTUFBTCxHQUFjLENBQTFCLEVBQTZCO0FBQzNCeEIsc0JBQWNDLElBQWQ7QUFDRDtBQUNGLEtBTjZEO0FBTzlEd0IsOEJBQTBCLFVBQVNDLFFBQVQsRUFBbUJDLE1BQW5CLEVBQTJCQyxNQUEzQixFQUFtQztBQUMzRCxVQUFJRixhQUFhLEtBQWpCLEVBQXdCO0FBQ3hCMUIsb0JBQWM0QixNQUFkO0FBQ0Q7QUFWNkQsR0FBcEQsQ0FBWjs7QUFhQSxTQUFPYixTQUFTYyxlQUFULENBQXlCLFdBQXpCLEVBQXNDLEVBQUVSLFdBQVdMLEtBQWIsRUFBdEMsQ0FBUDtBQUNELENBakJjLEciLCJmaWxlIjoieC1yZXF1aXJlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHVybCBmcm9tICd1cmwnO1xuXG5mdW5jdGlvbiByZXF1aXJlTW9kdWxlKGhyZWYpIHtcbiAgbGV0IGZpbGVQYXRoID0gaHJlZjtcbiAgXG4gIGlmIChmaWxlUGF0aC5tYXRjaCgvXmZpbGU6L2kpKSB7XG4gICAgbGV0IHRoZVVybCA9IHVybC5wYXJzZShmaWxlUGF0aCk7XG4gICAgZmlsZVBhdGggPSBkZWNvZGVVUklDb21wb25lbnQodGhlVXJsLnBhdGhuYW1lKTtcblxuICAgIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInKSB7XG4gICAgICBmaWxlUGF0aCA9IGZpbGVQYXRoLnNsaWNlKDEpO1xuICAgIH1cbiAgfVxuICBcbiAgLy8gTkI6IFdlIGRvbid0IGRvIGFueSBwYXRoIGNhbm9uaWNhbGl6YXRpb24gaGVyZSBiZWNhdXNlIHdlIHJlbHkgb25cbiAgLy8gSW5saW5lSHRtbENvbXBpbGVyIHRvIGhhdmUgYWxyZWFkeSBjb252ZXJ0ZWQgYW55IHJlbGF0aXZlIHBhdGhzIHRoYXRcbiAgLy8gd2VyZSB1c2VkIHdpdGggeC1yZXF1aXJlIGludG8gYWJzb2x1dGUgcGF0aHMuXG4gIHJlcXVpcmUoZmlsZVBhdGgpO1xufVxuXG4vKipcbiAqIEBwcml2YXRlXG4gKi8gXG5leHBvcnQgZGVmYXVsdCAoKCkgPT4ge1xuICBpZiAocHJvY2Vzcy50eXBlICE9PSAncmVuZGVyZXInIHx8ICF3aW5kb3cgfHwgIXdpbmRvdy5kb2N1bWVudCkgcmV0dXJuIG51bGw7XG4gIFxuICBsZXQgcHJvdG8gPSBPYmplY3QuYXNzaWduKE9iamVjdC5jcmVhdGUoSFRNTEVsZW1lbnQucHJvdG90eXBlKSwge1xuICAgIGNyZWF0ZWRDYWxsYmFjazogZnVuY3Rpb24oKSB7XG4gICAgICBsZXQgaHJlZiA9IHRoaXMuZ2V0QXR0cmlidXRlKCdzcmMnKTtcbiAgICAgIGlmIChocmVmICYmIGhyZWYubGVuZ3RoID4gMCkge1xuICAgICAgICByZXF1aXJlTW9kdWxlKGhyZWYpO1xuICAgICAgfVxuICAgIH0sIFxuICAgIGF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjazogZnVuY3Rpb24oYXR0ck5hbWUsIG9sZFZhbCwgbmV3VmFsKSB7XG4gICAgICBpZiAoYXR0ck5hbWUgIT09ICdzcmMnKSByZXR1cm47XG4gICAgICByZXF1aXJlTW9kdWxlKG5ld1ZhbCk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gZG9jdW1lbnQucmVnaXN0ZXJFbGVtZW50KCd4LXJlcXVpcmUnLCB7IHByb3RvdHlwZTogcHJvdG8gfSk7XG59KSgpO1xuIl19