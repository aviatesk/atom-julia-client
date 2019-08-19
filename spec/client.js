/** @babel */

import path from 'path'

import juno from '../lib/julia-client'
import { BOOT_TIMEOUT, EVALUATION_TIMEOUT } from './julia-client-spec'

const client = juno.connection.client
const { echo, evalsimple } = client.import([ 'ping', 'echo', 'evalsimple' ])

function clientStatus () {
  return [client.isActive(), client.isWorking()]
}
function checkPath (path) {
  return juno.misc.paths.getVersion(path)
}

export default function testClient () {
  describe('before booting', () => {
    it('can invalidate a non-existant julia binary', () => {
      waitsFor(done => {
        checkPath(path.join('imnot', 'julia')).catch(() => done())
      })
    })

    it('can validate a julia command', () => {
      waitsFor(done => {
        checkPath('julia').then(() => done())
      })
    })
  })

  let conn = null
  beforeEach(() => {
    if (conn !== null) client.attach(conn)
  })

  describe('when booting the client', () => {
    it('recognises the client\'s state before boot', () => {
      expect(clientStatus()).toEqual([false, false])
    })

    it('boots the client', () => {
      waitsForPromise({
        timeout: BOOT_TIMEOUT,
        label: `booting julia client`
      }, () => juno.connection.boot())

      runs(() => {
        expect(clientStatus()).toEqual([true, true])
        conn = client.conn
      })
    })

    // it('recognises the client\'s state after boot', () => {
    //   expect(clientStatus()).toEqual([true, false])
    // })
  })

  describe('while the client is active', () => {
    it('can send and receive nested objects, strings and arrays', () => {
      const msg = {
        x: 1,
        y: [1, 2, 3],
        z: 'foo'
      }
      waitsForPromise(() => {
        return echo(msg).then(response => {
          expect(response).toEqual(msg);
        })
      })
    })

    it('can evaluate code and return the result', () => {
      const promises = Array.from(Array(10).keys()).map(i => {
        return evalsimple(i + '^2')
      })

      waitsForPromise(() => {
        return Promise.all(promises).then(val => {
          const expected = Array.from(Array(10).keys()).map(i => {
            return Math.pow(i, 2)
          })
          expect(val).toEqual(expected)
        })
      })
    })

    it('can rpc into the frontend', () => {
      client.handle({
        test: (x) => {
          return Math.pow(x, 2);
        }
      })
      const promises = []
      const expected = []
      Array.from(Array(10).keys()).forEach(i => {
        promises.push(evalsimple(`Atom.@rpc test(${i})`))
        expected.push(Math.pow(i, 2))
      })

      return waitsForPromise(() => {
        return Promise.all(promises).then(ret => {
          expect(ret).toEqual(expected)
        })
      })
    })

    it('can retrieve promise values from the frontend', function() {
      client.handle({
        test: (x) => {
          return Promise.resolve(x)
        }
      })
      waitsFor(done => {
        evalsimple('Atom.@rpc test(2)').then(ret => {
          expect(ret).toBe(2)
          done()
        })
      })
    })

    describe('when using callbacks', function() {
      let doneSpy, callbacks
      beforeEach(() => {
        client.onDone((doneSpy = jasmine.createSpy('done')))
        callbacks = Array.from(Array(10).keys()).slice(1).map(i => {
          return evalsimple(`peakflops(${i})`)
        })
      })

      it('enters loading state', () => {
        return expect(client.isWorking()).toBe(true)
      })

      it('isn\'t done yet', () => {
        expect(doneSpy).not.toHaveBeenCalled()
      })

      describe('when they finish', () => {
        beforeEach(() => {
          waitsForPromise({
            timeout: EVALUATION_TIMEOUT
          }, () => {
            return Promise.all(callbacks)
          })
        })

        it('stops loading after they are done', () => {
          expect(client.isWorking()).toBe(false)
        })

        it('emits a done event', () => {
          expect(doneSpy.calls.length).toBe(1)
        })
      })
    })

    it('can handle a large number of concurrent callbacks', () => {
      const n = 100;
      const callbacks = []
      const expected = []
      Array.from(Array(n).keys()).forEach(i => {
        callbacks.push(evalsimple(`sleep(rand()); ${i}^2`))
        expected.push(Math.pow(i, 2))
      })

      waitsForPromise(() => {
        return Promise.all(callbacks).then(ret => {
          expect(ret).toEqual(expected)
        })
      })
    })
  })

  it('handles shutdown correctly', () => {
    waitsFor(done => {
      evalsimple('exit()').catch(() => {
        done()
      })
    })

    runs(() => {
      expect(clientStatus()).toEqual([false, false])
    })
  })
}
