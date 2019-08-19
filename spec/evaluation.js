'use babel'

import juno from '../lib/julia-client'
import { EVALUATION_TIMEOUT } from './julia-client-spec'

const { client } = juno.connection

function command (editor, command) {
  atom.commands.dispatch(atom.views.getView(editor), command)
}
function waitsForClient () {
  return waitsFor(done => {
    client.onceDone(done)
  }, EVALUATION_TIMEOUT, 'evaluating code')
}

export default function testEvaluation () {
  let editor
  beforeEach(() => {
    waitsForPromise(() => {
      return atom.workspace.open().then(ed => {
        editor = ed
      })
    })

    runs(() => {
      editor.setGrammar(atom.grammars.grammarForScopeName('source.julia'))
    })
  })

  it('can evaluate code', () => {
    const spy = jasmine.createSpy()
    client.handle({ test: spy })
    editor.insertText('Atom.@rpc test()')
    command(editor, 'julia-client:run-block')

    waitsForClient()
    runs(() => expect(spy).toHaveBeenCalled())
  })

  describe('when an expression is evaluated', function() {
    var results;
    results = null;
    beforeEach(function() {
      editor.insertText('2+2');
      return waitsForPromise((function(_this) {
        return function() {
          return juno.runtime.evaluation['eval']().then(function(x) {
            return results = x;
          });
        };
      })(this));
    });
    it('retrieves the value of the expression', function() {
      var view;
      expect(results.length).toBe(1);
      view = juno.ui.views.render(results[0]);
      return expect(view.innerText).toBe('4');
    });
    return it('displays the result', function() {
      var views;
      views = atom.views.getView(editor).querySelectorAll('.result');
      expect(views.length).toBe(1);
      return expect(views[0].innerText).toBe('4');
    });
  });
  return describe('completions', function() {
    var completionsData, getSuggestions;
    completionsData = function() {
      return {
        editor: editor,
        bufferPosition: editor.getCursors()[0].getBufferPosition(),
        scopeDescriptor: editor.getCursors()[0].getScopeDescriptor(),
        prefix: editor.getText()
      };
    };
    getSuggestions = function() {
      var completions;
      completions = require('../lib/runtime/completions');
      return completions.getSuggestions(completionsData());
    };
    return describe('basic module completions', function() {
      var completions;
      completions = null;
      beforeEach(function() {
        editor.insertText('sin');
        return waitsForPromise(function() {
          return getSuggestions().then(function(cs) {
            return completions = cs;
          });
        });
      });
      return it('retrieves completions', function() {
        completions = completions.map(function(c) {
          return c.text;
        });
        expect(completions).toContain('sin');
        expect(completions).toContain('sincos');
        return expect(completions).toContain('sinc');
      });
    });
  });
}
