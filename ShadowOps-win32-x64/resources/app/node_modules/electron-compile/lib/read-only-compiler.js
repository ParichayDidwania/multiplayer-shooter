"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

/**
 * ReadOnlyCompiler is a compiler which allows the host to inject all of the compiler
 * metadata information so that {@link CompileCache} et al are able to recreate the
 * hash without having two separate code paths.
 */
class ReadOnlyCompiler {
  /**
   * Creates a ReadOnlyCompiler instance
   *
   * @private
   */
  constructor(name, compilerVersion, compilerOptions, inputMimeTypes) {
    Object.assign(this, { name, compilerVersion, compilerOptions, inputMimeTypes });
  }

  shouldCompileFile() {
    return _asyncToGenerator(function* () {
      return true;
    })();
  }
  determineDependentFiles() {
    return _asyncToGenerator(function* () {
      return [];
    })();
  }

  compile() {
    return _asyncToGenerator(function* () {
      throw new Error("Read-only compilers can't compile");
    })();
  }

  shouldCompileFileSync() {
    return true;
  }
  determineDependentFilesSync() {
    return [];
  }

  compileSync() {
    throw new Error("Read-only compilers can't compile");
  }

  getCompilerVersion() {
    return this.compilerVersion;
  }
}
exports.default = ReadOnlyCompiler;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9yZWFkLW9ubHktY29tcGlsZXIuanMiXSwibmFtZXMiOlsiUmVhZE9ubHlDb21waWxlciIsImNvbnN0cnVjdG9yIiwibmFtZSIsImNvbXBpbGVyVmVyc2lvbiIsImNvbXBpbGVyT3B0aW9ucyIsImlucHV0TWltZVR5cGVzIiwiT2JqZWN0IiwiYXNzaWduIiwic2hvdWxkQ29tcGlsZUZpbGUiLCJkZXRlcm1pbmVEZXBlbmRlbnRGaWxlcyIsImNvbXBpbGUiLCJFcnJvciIsInNob3VsZENvbXBpbGVGaWxlU3luYyIsImRldGVybWluZURlcGVuZGVudEZpbGVzU3luYyIsImNvbXBpbGVTeW5jIiwiZ2V0Q29tcGlsZXJWZXJzaW9uIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7OztBQUtlLE1BQU1BLGdCQUFOLENBQXVCO0FBQ3BDOzs7OztBQUtBQyxjQUFZQyxJQUFaLEVBQWtCQyxlQUFsQixFQUFtQ0MsZUFBbkMsRUFBb0RDLGNBQXBELEVBQW9FO0FBQ2xFQyxXQUFPQyxNQUFQLENBQWMsSUFBZCxFQUFvQixFQUFFTCxJQUFGLEVBQVFDLGVBQVIsRUFBeUJDLGVBQXpCLEVBQTBDQyxjQUExQyxFQUFwQjtBQUNEOztBQUVLRyxtQkFBTixHQUEwQjtBQUFBO0FBQUUsYUFBTyxJQUFQO0FBQUY7QUFBZ0I7QUFDcENDLHlCQUFOLEdBQWdDO0FBQUE7QUFBRSxhQUFPLEVBQVA7QUFBRjtBQUFjOztBQUV4Q0MsU0FBTixHQUFnQjtBQUFBO0FBQ2QsWUFBTSxJQUFJQyxLQUFKLENBQVUsbUNBQVYsQ0FBTjtBQURjO0FBRWY7O0FBRURDLDBCQUF3QjtBQUFFLFdBQU8sSUFBUDtBQUFjO0FBQ3hDQyxnQ0FBOEI7QUFBRSxXQUFPLEVBQVA7QUFBWTs7QUFFNUNDLGdCQUFjO0FBQ1osVUFBTSxJQUFJSCxLQUFKLENBQVUsbUNBQVYsQ0FBTjtBQUNEOztBQUVESSx1QkFBcUI7QUFDbkIsV0FBTyxLQUFLWixlQUFaO0FBQ0Q7QUExQm1DO2tCQUFqQkgsZ0IiLCJmaWxlIjoicmVhZC1vbmx5LWNvbXBpbGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBSZWFkT25seUNvbXBpbGVyIGlzIGEgY29tcGlsZXIgd2hpY2ggYWxsb3dzIHRoZSBob3N0IHRvIGluamVjdCBhbGwgb2YgdGhlIGNvbXBpbGVyXG4gKiBtZXRhZGF0YSBpbmZvcm1hdGlvbiBzbyB0aGF0IHtAbGluayBDb21waWxlQ2FjaGV9IGV0IGFsIGFyZSBhYmxlIHRvIHJlY3JlYXRlIHRoZVxuICogaGFzaCB3aXRob3V0IGhhdmluZyB0d28gc2VwYXJhdGUgY29kZSBwYXRocy5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmVhZE9ubHlDb21waWxlciB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgUmVhZE9ubHlDb21waWxlciBpbnN0YW5jZVxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY29uc3RydWN0b3IobmFtZSwgY29tcGlsZXJWZXJzaW9uLCBjb21waWxlck9wdGlvbnMsIGlucHV0TWltZVR5cGVzKSB7XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCB7IG5hbWUsIGNvbXBpbGVyVmVyc2lvbiwgY29tcGlsZXJPcHRpb25zLCBpbnB1dE1pbWVUeXBlcyB9KTtcbiAgfVxuXG4gIGFzeW5jIHNob3VsZENvbXBpbGVGaWxlKCkgeyByZXR1cm4gdHJ1ZTsgfVxuICBhc3luYyBkZXRlcm1pbmVEZXBlbmRlbnRGaWxlcygpIHsgcmV0dXJuIFtdOyB9XG5cbiAgYXN5bmMgY29tcGlsZSgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJSZWFkLW9ubHkgY29tcGlsZXJzIGNhbid0IGNvbXBpbGVcIik7XG4gIH1cblxuICBzaG91bGRDb21waWxlRmlsZVN5bmMoKSB7IHJldHVybiB0cnVlOyB9XG4gIGRldGVybWluZURlcGVuZGVudEZpbGVzU3luYygpIHsgcmV0dXJuIFtdOyB9XG5cbiAgY29tcGlsZVN5bmMoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiUmVhZC1vbmx5IGNvbXBpbGVycyBjYW4ndCBjb21waWxlXCIpO1xuICB9XG5cbiAgZ2V0Q29tcGlsZXJWZXJzaW9uKCkge1xuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyVmVyc2lvbjtcbiAgfVxufVxuIl19