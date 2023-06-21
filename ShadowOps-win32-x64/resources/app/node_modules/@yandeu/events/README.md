# Events

Simplified and TypeScripted version of EventEmitter3@4.0.7  
(_no support for Symbols_)

## Installation

```console
npm install @yandeu/events
```

## CDN

```console
// ES2015+
https://unpkg.com/@yandeu/events/umd/events.min.js

// ES5
https://unpkg.com/@yandeu/events/umd/events.es5.min.js
```

## Usage

```ts
const { Events } = require('@yandeu/events')

// or
// import { Events } from '@yandeu/events'

const events = new Events()

events.on('message', msg => {
  console.log(`Message: ${msg}`)
})

events.emit('message', 'Hello there!')

// will print: Message: Hello there!
```

```ts
// print the current version
console.log('Events VERSION: ', Events.VERSION)
```

## TypeScript

```ts
import { Events } from '@yandeu/events'

interface EventMap {
  signal: () => void
  error: (err: string) => void
  something: (a: number, b: { color?: string }, c: [number, number, string]) => void
}

const events = new Events<EventMap>()

events.on('something', (a, b, c) => {
  console.log(a, b.color, c)
})

events.emit('something', 1, { color: 'blue' }, [2, 2, 'k'])
```

```ts
import type { EventListener } from '@yandeu/events'

// typed listener
const listener: EventListener<EventMap, 'error'> = err => {
  console.log('err:', err)
}

// add listener
events.on('error', listener)

// remove listener
// (once you don't need it anymore)
events.removeListener('error', listener)
```

## License

[MIT](LICENSE)
