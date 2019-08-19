/** @babel */

import juno from '../lib/julia-client'
import testClient from './client'
import testEvaluation from './evaluation'

const ATOM_HOME = process.env.ATOM_HOME
export const BOOT_TIMEOUT = 3 * 60 * 1000
export const EVALUATION_TIMEOUT = 60 * 1000

const { client } = juno.connection

function basicSetup () {
  jasmine.attachToDOM(atom.views.getView(atom.workspace))
  waitsForPromise(() => atom.packages.activatePackage('language-julia'))
  waitsForPromise(() => atom.packages.activatePackage('ink'))
  waitsForPromise(() => atom.packages.activatePackage('julia-client'))

  runs(() => {
    atom.config.set('julia-client', {
      juliaPath: 'julia',
      juliaOptions: {
        bootMode: 'Basic',
        optimisationLevel: 2,
        deprecationWarnings: false
      },
      consoleOptions: {
        rendererType: true
      }
    })
  })
}

function cyclerSetup () {
  basicSetup()
  runs(() => atom.config.set('julia-client.juliaOptions.bootMode', 'Cycler'))
}

describe('basic client', () => {
  beforeEach(basicSetup)
  testClient()
})

describe('cycler client', () => {
  beforeEach(cyclerSetup)
  testClient()
})

describe('in editor code evaluation', () => {
  beforeEach(() => {
    cyclerSetup()

    waitsForPromise({
      timeout: BOOT_TIMEOUT,
      label: `booting julia client`
    }, () => juno.connection.boot())

    runs(() => client.attach(client.conn))
  })

  testEvaluation()
})
