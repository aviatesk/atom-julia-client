{time} = require './misc'

metrics = ->
  if id = localStorage.getItem 'metrics.userId'
    r = require('http').get "http://data.junolab.org/hit?id=#{id}&app=atom-julia-boot"
    r.on 'error', ->

module.exports =
  IPC:      require './connection/ipc'
  messages: require './connection/messages'
  client:   require './connection/client'
  local:    require './connection/local'
  terminal: require './connection/terminal'

  activate: ->
    @messages.activate()
    @client.activate()
    @client.boot = => @boot()
    @local.activate()
    @booting = false

  deactivate: ->
    @client.deactivate()

  consumeInk: (ink) ->
    @IPC.consumeInk ink
    @ink = ink

  consumeGetServerConfig: (getconf) ->
    @local.consumeGetServerConfig(getconf)

  consumeGetServerName: (name) ->
    @local.consumeGetServerName(name)

  _boot: (provider) ->
    if not @client.isActive() and not @booting
      @booting = true
      @client.setBootMode(provider)
      p = @local.start(provider)
      if @ink?
        @ink.Opener.allowRemoteFiles(provider == 'Remote')
      p.then =>
        @booting = false
      p.catch =>
        @booting = false
      time "Julia Boot", @client.import('ping')().then =>
        metrics()

  bootRemote: ->
    @_boot('Remote')

  boot: ->
    @_boot(atom.config.get('julia-client.juliaOptions.bootMode'))
