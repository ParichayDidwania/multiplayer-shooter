'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.init = init;

var _mimeTypes = require('@paulcbetts/mime-types');

var _mimeTypes2 = _interopRequireDefault(_mimeTypes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const typesToRig = {
  'text/typescript': 'ts',
  'text/tsx': 'tsx',
  'text/jade': 'jade',
  'text/cson': 'cson',
  'text/stylus': 'styl',
  'text/sass': 'sass',
  'text/scss': 'scss',
  'text/vue': 'vue',
  'text/graphql': 'graphql'
};

/**
 * Adds MIME types for types not in the mime-types package
 *
 * @private
 */
function init() {
  Object.keys(typesToRig).forEach(type => {
    let ext = typesToRig[type];

    _mimeTypes2.default.types[ext] = type;
    _mimeTypes2.default.extensions[type] = [ext];
  });
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9yaWctbWltZS10eXBlcy5qcyJdLCJuYW1lcyI6WyJpbml0IiwidHlwZXNUb1JpZyIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwidHlwZSIsImV4dCIsIm1pbWVUeXBlcyIsInR5cGVzIiwiZXh0ZW5zaW9ucyJdLCJtYXBwaW5ncyI6Ijs7Ozs7UUFtQmdCQSxJLEdBQUFBLEk7O0FBbkJoQjs7Ozs7O0FBRUEsTUFBTUMsYUFBYTtBQUNqQixxQkFBbUIsSUFERjtBQUVqQixjQUFZLEtBRks7QUFHakIsZUFBYSxNQUhJO0FBSWpCLGVBQWEsTUFKSTtBQUtqQixpQkFBZSxNQUxFO0FBTWpCLGVBQWEsTUFOSTtBQU9qQixlQUFhLE1BUEk7QUFRakIsY0FBWSxLQVJLO0FBU2pCLGtCQUFnQjtBQVRDLENBQW5COztBQVlBOzs7OztBQUtPLFNBQVNELElBQVQsR0FBZ0I7QUFDckJFLFNBQU9DLElBQVAsQ0FBWUYsVUFBWixFQUF3QkcsT0FBeEIsQ0FBaUNDLElBQUQsSUFBVTtBQUN4QyxRQUFJQyxNQUFNTCxXQUFXSSxJQUFYLENBQVY7O0FBRUFFLHdCQUFVQyxLQUFWLENBQWdCRixHQUFoQixJQUF1QkQsSUFBdkI7QUFDQUUsd0JBQVVFLFVBQVYsQ0FBcUJKLElBQXJCLElBQTZCLENBQUNDLEdBQUQsQ0FBN0I7QUFDRCxHQUxEO0FBTUQiLCJmaWxlIjoicmlnLW1pbWUtdHlwZXMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgbWltZVR5cGVzIGZyb20gJ0BwYXVsY2JldHRzL21pbWUtdHlwZXMnO1xuXG5jb25zdCB0eXBlc1RvUmlnID0ge1xuICAndGV4dC90eXBlc2NyaXB0JzogJ3RzJyxcbiAgJ3RleHQvdHN4JzogJ3RzeCcsXG4gICd0ZXh0L2phZGUnOiAnamFkZScsXG4gICd0ZXh0L2Nzb24nOiAnY3NvbicsXG4gICd0ZXh0L3N0eWx1cyc6ICdzdHlsJyxcbiAgJ3RleHQvc2Fzcyc6ICdzYXNzJyxcbiAgJ3RleHQvc2Nzcyc6ICdzY3NzJyxcbiAgJ3RleHQvdnVlJzogJ3Z1ZScsXG4gICd0ZXh0L2dyYXBocWwnOiAnZ3JhcGhxbCcsXG59O1xuXG4vKipcbiAqIEFkZHMgTUlNRSB0eXBlcyBmb3IgdHlwZXMgbm90IGluIHRoZSBtaW1lLXR5cGVzIHBhY2thZ2VcbiAqXG4gKiBAcHJpdmF0ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5pdCgpIHtcbiAgT2JqZWN0LmtleXModHlwZXNUb1JpZykuZm9yRWFjaCgodHlwZSkgPT4ge1xuICAgIGxldCBleHQgPSB0eXBlc1RvUmlnW3R5cGVdO1xuXG4gICAgbWltZVR5cGVzLnR5cGVzW2V4dF0gPSB0eXBlO1xuICAgIG1pbWVUeXBlcy5leHRlbnNpb25zW3R5cGVdID0gW2V4dF07XG4gIH0pO1xufVxuIl19