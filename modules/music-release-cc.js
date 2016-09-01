var markdown = require('ssb-markdown');
var h = require('hyperscript');
var u = require('../util');
var ref = require('ssb-ref');

//render a message

var plugs = require('../plugs');
var message_link = plugs.first(exports.message_link = []);
var message_confirm = plugs.first(exports.message_confirm = []);
var sbot_links = plugs.first(exports.sbot_links = []);
var blob_url = plugs.first(exports.blob_url = []);

exports.message_content = function(msg, sbot) {
    if (msg.value.content.type !== 'music-release-cc')
        return;

    var tracks = msg.value.content.tracks;
    return h('div',
        h('img', { "src" : blob_url(msg.value.content.cover) }),
        h('h1', msg.value.content.title),
        h('ol',
                 Object.keys(tracks).map(function(k) {
                     var t = tracks[k];
                     return h('li', t.fname,
                         h("br"),
                         h('audio', {
                                  "controls" : true,
                                  "src" : blob_url(t.link)
                              }))
                 })),
        h('p',
                 "More info:", h('a', { href : msg.value.content.archivedotorg }, "archive.org"),
                 h("br"),
                 "License:", h('a', { href : msg.value.content.license }, "Link")))
}

// copied from like.js

// inspiration for waveform range selection

// idea: handout invite codes for upload of tracks to be cached by the pub

// exports.message_meta = function (msg, sbot) {

//   var yupps = h('a')

//   pull(
//     sbot_links({dest: msg.key, rel: 'vote'}),
//     pull.collect(function (err, votes) {
//       if(votes.length === 1)
//         yupps.textContent = ' 1 yup'
//       if(votes.length)
//         yupps.textContent = ' ' + votes.length + ' yupps'
//     })
//   )

//   return yupps
// }

// exports.message_action = function (msg, sbot) {
//   if(msg.value.content.type !== 'vote')
//     return h('a', {href: '#', onclick: function () {
//       var yup = {
//         type: 'vote',
//         vote: { link: msg.key, value: 1, expression: 'yup' }
//       }
//       if(msg.value.content.recps) {
//         yup.recps = msg.value.content.recps.map(function (e) {
//           return e && typeof e !== 'string' ? e.link : e
//         })
//         yup.private = true
//       }
//       //TODO: actually publish...

//       message_confirm(yup)
//     }}, 'yup')

// }

