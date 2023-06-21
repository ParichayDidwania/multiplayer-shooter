'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createDigestForObject;

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function updateDigestForJsonValue(shasum, value) {
  // Implmentation is similar to that of pretty-printing a JSON object, except:
  // * Strings are not escaped.
  // * No effort is made to avoid trailing commas.
  // These shortcuts should not affect the correctness of this function.
  const type = typeof value;

  if (type === 'string') {
    shasum.update('"', 'utf8');
    shasum.update(value, 'utf8');
    shasum.update('"', 'utf8');
    return;
  }

  if (type === 'boolean' || type === 'number') {
    shasum.update(value.toString(), 'utf8');
    return;
  }

  if (!value) {
    shasum.update('null', 'utf8');
    return;
  }

  if (Array.isArray(value)) {
    shasum.update('[', 'utf8');
    for (let i = 0; i < value.length; i++) {
      updateDigestForJsonValue(shasum, value[i]);
      shasum.update(',', 'utf8');
    }
    shasum.update(']', 'utf8');
    return;
  }

  // value must be an object: be sure to sort the keys.
  let keys = Object.keys(value);
  keys.sort();

  shasum.update('{', 'utf8');

  for (let i = 0; i < keys.length; i++) {
    updateDigestForJsonValue(shasum, keys[i]);
    shasum.update(': ', 'utf8');
    updateDigestForJsonValue(shasum, value[keys[i]]);
    shasum.update(',', 'utf8');
  }

  shasum.update('}', 'utf8');
}

/**
 * Creates a hash from a JS object
 * 
 * @private  
 */
function createDigestForObject(obj) {
  let sha1 = _crypto2.default.createHash('sha1');
  updateDigestForJsonValue(sha1, obj);

  return sha1.digest('hex');
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9kaWdlc3QtZm9yLW9iamVjdC5qcyJdLCJuYW1lcyI6WyJjcmVhdGVEaWdlc3RGb3JPYmplY3QiLCJ1cGRhdGVEaWdlc3RGb3JKc29uVmFsdWUiLCJzaGFzdW0iLCJ2YWx1ZSIsInR5cGUiLCJ1cGRhdGUiLCJ0b1N0cmluZyIsIkFycmF5IiwiaXNBcnJheSIsImkiLCJsZW5ndGgiLCJrZXlzIiwiT2JqZWN0Iiwic29ydCIsIm9iaiIsInNoYTEiLCJjcnlwdG8iLCJjcmVhdGVIYXNoIiwiZGlnZXN0Il0sIm1hcHBpbmdzIjoiOzs7OztrQkEwRHdCQSxxQjs7QUExRHhCOzs7Ozs7QUFFQSxTQUFTQyx3QkFBVCxDQUFrQ0MsTUFBbEMsRUFBMENDLEtBQTFDLEVBQWlEO0FBQy9DO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBTUMsT0FBTyxPQUFPRCxLQUFwQjs7QUFFQSxNQUFJQyxTQUFTLFFBQWIsRUFBdUI7QUFDckJGLFdBQU9HLE1BQVAsQ0FBYyxHQUFkLEVBQW1CLE1BQW5CO0FBQ0FILFdBQU9HLE1BQVAsQ0FBY0YsS0FBZCxFQUFxQixNQUFyQjtBQUNBRCxXQUFPRyxNQUFQLENBQWMsR0FBZCxFQUFtQixNQUFuQjtBQUNBO0FBQ0Q7O0FBRUQsTUFBSUQsU0FBUyxTQUFULElBQXNCQSxTQUFTLFFBQW5DLEVBQTZDO0FBQzNDRixXQUFPRyxNQUFQLENBQWNGLE1BQU1HLFFBQU4sRUFBZCxFQUFnQyxNQUFoQztBQUNBO0FBQ0Q7O0FBRUQsTUFBSSxDQUFDSCxLQUFMLEVBQVk7QUFDVkQsV0FBT0csTUFBUCxDQUFjLE1BQWQsRUFBc0IsTUFBdEI7QUFDQTtBQUNEOztBQUVELE1BQUlFLE1BQU1DLE9BQU4sQ0FBY0wsS0FBZCxDQUFKLEVBQTBCO0FBQ3hCRCxXQUFPRyxNQUFQLENBQWMsR0FBZCxFQUFtQixNQUFuQjtBQUNBLFNBQUssSUFBSUksSUFBRSxDQUFYLEVBQWNBLElBQUlOLE1BQU1PLE1BQXhCLEVBQWdDRCxHQUFoQyxFQUFxQztBQUNuQ1IsK0JBQXlCQyxNQUF6QixFQUFpQ0MsTUFBTU0sQ0FBTixDQUFqQztBQUNBUCxhQUFPRyxNQUFQLENBQWMsR0FBZCxFQUFtQixNQUFuQjtBQUNEO0FBQ0RILFdBQU9HLE1BQVAsQ0FBYyxHQUFkLEVBQW1CLE1BQW5CO0FBQ0E7QUFDRDs7QUFFRDtBQUNBLE1BQUlNLE9BQU9DLE9BQU9ELElBQVAsQ0FBWVIsS0FBWixDQUFYO0FBQ0FRLE9BQUtFLElBQUw7O0FBRUFYLFNBQU9HLE1BQVAsQ0FBYyxHQUFkLEVBQW1CLE1BQW5COztBQUVBLE9BQUssSUFBSUksSUFBRSxDQUFYLEVBQWNBLElBQUlFLEtBQUtELE1BQXZCLEVBQStCRCxHQUEvQixFQUFvQztBQUNsQ1IsNkJBQXlCQyxNQUF6QixFQUFpQ1MsS0FBS0YsQ0FBTCxDQUFqQztBQUNBUCxXQUFPRyxNQUFQLENBQWMsSUFBZCxFQUFvQixNQUFwQjtBQUNBSiw2QkFBeUJDLE1BQXpCLEVBQWlDQyxNQUFNUSxLQUFLRixDQUFMLENBQU4sQ0FBakM7QUFDQVAsV0FBT0csTUFBUCxDQUFjLEdBQWQsRUFBbUIsTUFBbkI7QUFDRDs7QUFFREgsU0FBT0csTUFBUCxDQUFjLEdBQWQsRUFBbUIsTUFBbkI7QUFDRDs7QUFHRDs7Ozs7QUFLZSxTQUFTTCxxQkFBVCxDQUErQmMsR0FBL0IsRUFBb0M7QUFDakQsTUFBSUMsT0FBT0MsaUJBQU9DLFVBQVAsQ0FBa0IsTUFBbEIsQ0FBWDtBQUNBaEIsMkJBQXlCYyxJQUF6QixFQUErQkQsR0FBL0I7O0FBRUEsU0FBT0MsS0FBS0csTUFBTCxDQUFZLEtBQVosQ0FBUDtBQUNEIiwiZmlsZSI6ImRpZ2VzdC1mb3Itb2JqZWN0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNyeXB0byBmcm9tICdjcnlwdG8nO1xuXG5mdW5jdGlvbiB1cGRhdGVEaWdlc3RGb3JKc29uVmFsdWUoc2hhc3VtLCB2YWx1ZSkge1xuICAvLyBJbXBsbWVudGF0aW9uIGlzIHNpbWlsYXIgdG8gdGhhdCBvZiBwcmV0dHktcHJpbnRpbmcgYSBKU09OIG9iamVjdCwgZXhjZXB0OlxuICAvLyAqIFN0cmluZ3MgYXJlIG5vdCBlc2NhcGVkLlxuICAvLyAqIE5vIGVmZm9ydCBpcyBtYWRlIHRvIGF2b2lkIHRyYWlsaW5nIGNvbW1hcy5cbiAgLy8gVGhlc2Ugc2hvcnRjdXRzIHNob3VsZCBub3QgYWZmZWN0IHRoZSBjb3JyZWN0bmVzcyBvZiB0aGlzIGZ1bmN0aW9uLlxuICBjb25zdCB0eXBlID0gdHlwZW9mKHZhbHVlKTtcblxuICBpZiAodHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICBzaGFzdW0udXBkYXRlKCdcIicsICd1dGY4Jyk7XG4gICAgc2hhc3VtLnVwZGF0ZSh2YWx1ZSwgJ3V0ZjgnKTtcbiAgICBzaGFzdW0udXBkYXRlKCdcIicsICd1dGY4Jyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHR5cGUgPT09ICdib29sZWFuJyB8fCB0eXBlID09PSAnbnVtYmVyJykge1xuICAgIHNoYXN1bS51cGRhdGUodmFsdWUudG9TdHJpbmcoKSwgJ3V0ZjgnKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAoIXZhbHVlKSB7XG4gICAgc2hhc3VtLnVwZGF0ZSgnbnVsbCcsICd1dGY4Jyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgc2hhc3VtLnVwZGF0ZSgnWycsICd1dGY4Jyk7XG4gICAgZm9yIChsZXQgaT0wOyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgIHVwZGF0ZURpZ2VzdEZvckpzb25WYWx1ZShzaGFzdW0sIHZhbHVlW2ldKTtcbiAgICAgIHNoYXN1bS51cGRhdGUoJywnLCAndXRmOCcpO1xuICAgIH1cbiAgICBzaGFzdW0udXBkYXRlKCddJywgJ3V0ZjgnKTtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyB2YWx1ZSBtdXN0IGJlIGFuIG9iamVjdDogYmUgc3VyZSB0byBzb3J0IHRoZSBrZXlzLlxuICBsZXQga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcbiAga2V5cy5zb3J0KCk7XG5cbiAgc2hhc3VtLnVwZGF0ZSgneycsICd1dGY4Jyk7XG5cbiAgZm9yIChsZXQgaT0wOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgIHVwZGF0ZURpZ2VzdEZvckpzb25WYWx1ZShzaGFzdW0sIGtleXNbaV0pO1xuICAgIHNoYXN1bS51cGRhdGUoJzogJywgJ3V0ZjgnKTtcbiAgICB1cGRhdGVEaWdlc3RGb3JKc29uVmFsdWUoc2hhc3VtLCB2YWx1ZVtrZXlzW2ldXSk7XG4gICAgc2hhc3VtLnVwZGF0ZSgnLCcsICd1dGY4Jyk7XG4gIH1cblxuICBzaGFzdW0udXBkYXRlKCd9JywgJ3V0ZjgnKTtcbn1cblxuXG4vKipcbiAqIENyZWF0ZXMgYSBoYXNoIGZyb20gYSBKUyBvYmplY3RcbiAqIFxuICogQHByaXZhdGUgIFxuICovIFxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY3JlYXRlRGlnZXN0Rm9yT2JqZWN0KG9iaikge1xuICBsZXQgc2hhMSA9IGNyeXB0by5jcmVhdGVIYXNoKCdzaGExJyk7XG4gIHVwZGF0ZURpZ2VzdEZvckpzb25WYWx1ZShzaGExLCBvYmopO1xuICBcbiAgcmV0dXJuIHNoYTEuZGlnZXN0KCdoZXgnKTtcbn1cbiJdfQ==