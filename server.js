const express = require('express')

var io = require('socket.io')
({
  path: '/io/webrtc'
})

const app = express()
const port = 8080

//app.get('/', (req, res) => res.send('Hello World!!!!!'))

//https://expressjs.com/en/guide/writing-middleware.html
app.use(express.static(__dirname + '/build'))
app.get('/', (req, res, next) => {
    res.sendFile(__dirname + '/build/index.html')
})

const server = app.listen(port, () => console.log(`Example app listening on port ${port}!`))

io.listen(server)

// default namespace
io.on('connection', socket => {
  console.log('connected')
})

// https://www.tutorialspoint.com/socket.io/socket.io_namespaces.htm
const peers = io.of('/webrtcPeer')

// keep a reference of all socket connections
let connectedPeers = new Map()  // {socket.id, socket}

peers.on('connection', socket => {

  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }

  log(`Server connected socket with socketID: ${socket.id}`);
  console.log(`Server connected the socket with socketID: ${socket.id}`);

  connectedPeers.set(socket.id, socket)

  // 지금 connection한 peer에게 보낸다.
  socket.emit('connection-success', {   
    success: socket.id,
    peerCount: connectedPeers.size,
   })

  // 이미 connection을 하고 있는 peers들에게 broadcast한다. joined-peers
  const broadcast = () => socket.broadcast.emit('joined-peers', {
    peerCount: connectedPeers.size,
  })
  broadcast()

  // 어떤 peer가 disconnect 하게 되면, 
  // connectedPeers에서 그 peer의 socket을 제거한다.
  // 이 peer를 제외한 모든 연결된 peers 들에게 'peer-discpnnected' 메시지를 보낸다.
  const disconnectedPeer = (socketID) => socket.broadcast.emit('peer-disconnected', {
    peerCount: connectedPeers.size,
    socketID: socketID
  })
  socket.on('disconnect', () => {
    log(`${socket.id} disconnected`)
    console.log(`${socket.id} disconnected`)
    connectedPeers.delete(socket.id)
    disconnectedPeer(socket.id)
  })

  socket.on('onlinePeers', (data) => {
    for (const [socketIDConnected, _socketConnected] of connectedPeers.entries()) {
      // don't send to self: sender: data.socketID.local, every connected peer: socketID
      if(socketIDConnected !== data.socketID.local) {  // for every connected peer who is not the sender
        log('online-peer', data.socketID, socketIDConnected)
        console.log('online-peer', data.socketID, socketIDConnected)
        socket.emit('online-peer', socketIDConnected)  // connected peer의 정보를 하나씩 하나씩 보낸다.
      }
    }
  })

  socket.on('offer', (data) => {
    log(`${socket.id} said: offer`)
    console.log(`${socket.id} said: offer`)
    // send to the other peer(s) if any.  // sender: data.socketID.local. connected peer: socketID
    for (const [socketIDConnected, socketConnected] of connectedPeers.entries()) {
      // don't send to self
      if (socketIDConnected === data.socketID.remote) {  // offer를 받을 상대, remote peer, 가 connected peer라면,
        log(`Signaling Server sent offer to ${socketIDConnected} with data: {sdp: ${data.payload}, socketID: ${data.socketID.local}}`)
        console.log(`Signaling Server sent offer to ${socketIDConnected} with data: {sdp: ${data.payload}, socketID: ${data.socketID.local}}`)
        socketConnected.emit('offer', {
          sdp: data.payload,
          socketID: data.socketID.local,
        })
      }
    }
  })

  socket.on('answer', (data) => {
    log(`${socket.id} said: answer`)
    console.log(`${socket.id} said: answer`)
    // send to the other peer(s) if any.  // sender: data.socketID.local. connected peer: socketID
    for (const [socketIDConnected, socketConnected] of connectedPeers.entries()) {
      // don't send to self
      if (socketIDConnected === data.socketID.remote) {  // answer를 받을 상대, remote peer, 가 connected peer라면,
        log(`Signaling Server sent offer to ${socketIDConnected} with data: {sdp: ${data.payload}, socketID: ${data.socketID.local}}`)
        console.log(`Signaling Server sent offer to ${socketIDConnected} with data: {sdp: ${data.payload}, socketID: ${data.socketID.local}}`)
        socketConnected.emit('answer', {
          sdp: data.payload,
          socketID: data.socketID.local,
        })
      }
    }
  })

  // socket.on('offerOrAnswer', (data) => {
  //   log(`${socket.id} said: offerOrAnswer`)
  //   console.log(`${socket.id} said: offerOrAnswer`)
  //   // send to the other peer(s) if any
  //   for (const [socketID, socket] of connectedPeers.entries()) {
  //     // don't send to self
  //     if (socketID !== data.socketID) {
  //       log(`Signaling Server sent offerOrAnswer to ${socketID} with data.payload.type: ${data.payload.type}`)
  //       console.log(`Signaling Server sent offerOrAnswer to ${socketID} with data.payload.type: ${data.payload.type}`)
  //       socket.emit('offerOrAnswer', data.payload)
  //     }
  //   }
  // })

  socket.on('candidate', (data) => {
    log(`${socket.id} said: candidate`)
    console.log(`${socket.id} said: candidate`)

    // send candidate to the other peer(s) if any
    for (const [socketIDConnected, socketConnected] of connectedPeers.entries()) {
      // don't send to self
      //console.log(`Signaling Server sent candidate to ${socketIDConnected} with data.payload: {candidate: ${data.payload}, socketID: ${data.scoketID.local}} `)
      if (socketIDConnected === data.socketID.remote) {
        //log(`Signaling Server sent candidate to ${socketIDConnected} with data.payload: {candidate: ${data.payload}, socketID: ${data.scoketID.local}} `)
        //console.log(`Signaling Server sent candidate to ${socketIDConnected} with data.payload: {candidate: ${data.payload}, socketID: ${data.scoketID.local}} `)
        socketConnected.emit('candidate', {
          candidate: data.payload,
          socketID: data.socketID.local
        })
      }
    }
  })
})