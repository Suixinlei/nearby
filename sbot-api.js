var pull = require('pull-stream')
var ssbKeys = require('ssb-keys')
var ref = require('ssb-ref')
var Reconnect = require('pull-reconnect')

function Hash (onHash) {
  var buffers = []
  return pull.through(function (data) {
    buffers.push('string' === typeof data
      ? new Buffer(data, 'utf8')
      : data
    )
  }, function (err) {
    if(err && !onHash) throw err
    var b = buffers.length > 1 ? Buffer.concat(buffers) : buffers[0]
    var h = '&'+ssbKeys.hash(b)
    onHash && onHash(err, h)
  })
}
//uncomment this to use from browser...
//also depends on having ssb-ws installed.
//var createClient = require('ssb-lite')
var createClient = require('ssb-client')

var createConfig = require('ssb-config/inject')

var createFeed   = require('ssb-feed')
var keys = require('./keys')
var ssbKeys = require('ssb-keys')


var cache = CACHE = {}

module.exports = function () {
  var opts = createConfig()
  var sbot = null
  var connection_status = []


  var rec = Reconnect(function (isConn) {
//    var remote
//    if('undefined' !== typeof localStorage)
//      remote = localStorage.remote

    function notify (value) {
      console.log('connection_status', value, connection_status)
      isConn(value); connection_status.forEach(function (fn) { fn(value) })
    }

    createClient(keys, {
      manifest: require('./manifest.json'),
      remote: require('./config')().remote
    }, function (err, _sbot) {
      if(err)
        return notify(err)

      sbot = _sbot
      sbot.on('closed', function () {
        sbot = null
        notify(new Error('closed'))
      })

      notify()
    })
  })

  var internal = {
    getLatest: rec.async(function (id, cb) {
      sbot.getLatest(id, cb)
    }),
    add: rec.async(function (msg, cb) {
      sbot.add(msg, cb)
    })
  }

  var feed = createFeed(internal, keys, {remote: true})

  return {
    connection_status: connection_status,
    sbot_blobs_add: rec.sink(function (cb) {
      return pull(
        Hash(function (err, id) {
          if(err) return cb(err)
          //completely UGLY hack to tell when the blob has been sucessfully written...
          var start = Date.now(), n = 5
          ;(function next () {
            setTimeout(function () {
              sbot.blobs.has(id, function (err, has) {
                if(has) return cb(null, id)
                if(n--) next()
                else cb(new Error('write failed'))
              })
            }, Date.now() - start)
          })()
        }),
        sbot.blobs.add()
      )
    }),
    sbot_links: rec.source(function (query) {
      return sbot.links(query)
    }),
    sbot_links2: rec.source(function (query) {
      return sbot.links2.read(query)
    }),
    sbot_query: rec.source(function (query) {
      return sbot.query.read(query)
    }),
    sbot_log: rec.source(function (opts) {
      return pull(
        sbot.createLogStream(opts),
        pull.through(function (e) {
          CACHE[e.key] = CACHE[e.key] || e.value
        })
      )
    }),
    sbot_user_feed: rec.source(function (opts) {
      return sbot.createUserStream(opts)
    }),
    sbot_get: rec.async(function (key, cb) {
      if(CACHE[key]) cb(null, CACHE[key])
      else sbot.get(key, function (err, value) {
        if(err) return cb(err)
        cb(null, CACHE[key] = value)
      })
    }),
    sbot_gossip_peers: rec.async(function (cb) {
      sbot.gossip.peers(cb)
    }),
    sbot_publish: rec.async(function (content, cb) {
      if(content.recps)
        content = ssbKeys.box(content, content.recps.map(function (e) {
          return ref.isFeed(e) ? e : e.link
        }))
      else if(content.mentions)
        content.mentions.forEach(function (mention) {
          if(ref.isBlob(mention.link)) {
            sbot.blobs.push(mention.link, function (err) {
              if(err) console.error(err)
            })
          }
        })

      feed.add(content, function (err, msg) {
        if(err) console.error(err)
        else if(!cb) console.log(msg)
        cb && cb(err, msg)
      })
    }),
    sbot_whoami: rec.async(function (cb) {
      sbot.whoami(cb)
    })
  }
}








