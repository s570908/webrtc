const express = require('express')

var io = require('socket.io')
({
  path: '/io/webrtc'
})

const app = express()
const port = 8080

// rooms 저장소를 만듦 

const rooms = {}

//app.get('/', (req, res) => res.send('Hello World!!!!!'))

//https://expressjs.com/en/guide/writing-middleware.html
app.use(express.static(__dirname + '/build'))
app.get('/', (req, res, next) => {    //default room
    res.sendFile(__dirname + '/build/index.html')
})

app.get('/:room', (req, res, next) => {
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
// let connectedPeers = new Map()  // {socket.id, socket}

peers.on('connection', socket => {

  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }

  log(`Server connected socket with socketID: ${socket.id}`);
  console.log(`Server connected the socket with socketID: ${socket.id}`);

  //  https://hostname:portname/room3, where room3 is called "a value for kthe path parameter :room"
  //  app.get('/:room', (req, res, next) => {...   , where :room or {room} is a path parameter
  //  socket.handshake.query: {room: room3}
  //  https://swagger.io/docs/specification/describing-parameters/
  const room = socket.handshake.query.room

  console.log("socket.handshake.query.room: ", socket.handshake.query.room)

  rooms[room] = rooms[room] && rooms[room].set(socket.id, socket) || (new Map()).set(socket.id, socket)

  // connectedPeers.set(socket.id, socket)

  console.log(`Now socket with socket.id "${socket.id}" joined in this room.`);
  // socket.id "/webrtcPeer#MnfEZ_GgLC6Hg911AAAD"

  // 지금 connection한 peer에게 보낸다.
  socket.emit('connection-success', {   
    success: socket.id,
    peerCount: rooms[room].size,
   })

  // 이미 connection을 하고 있는 peers들에게 broadcast한다. joined-peers
  // const broadcast = () => socket.broadcast.emit('joined-peers', {
  //   peerCount: connectedPeers.size,
  // })

  const broadcast = () => {
    const _connectedPeers = rooms[room]

    for (const [socketIDConnected, _socketConnected] of _connectedPeers.entries()) {
      // if (socketIDConnected !== socket.id) {
        _socketConnected.emit('joined-peers', {
          peerCount: rooms[room].size, //connectedPeers.size,
        })
      // }
    }
  }
  broadcast()

  // 어떤 peer가 disconnect 하게 되면, 
  // connectedPeers에서 그 peer의 socket을 제거한다.
  // 이 peer를 제외한 모든 연결된 peers 들에게 'peer-discpnnected' 메시지를 보낸다.
  // const disconnectedPeer = (socketID) => socket.broadcast.emit('peer-disconnected', {
  //   peerCount: connectedPeers.size,
  //   socketID: socketID
  // })
  const disconnectedPeer = (socketID) => {
    const _connectedPeers = rooms[room]
    for (const [_socketIDConnected, _socketConnected] of _connectedPeers.entries()) {
        _socketConnected.emit('peer-disconnected', {
          peerCount: rooms[room].size,
          socketID   // disconnect된 socket
        })
    }
  }

  socket.on('disconnect', () => {
    log(`${socket.id} disconnected`)
    console.log(`${socket.id} disconnected`)
    //connectedPeers.delete(socket.id)
    rooms[room].delete(socket.id)
    disconnectedPeer(socket.id)
  })

  socket.on('onlinePeers', (data) => {
    const _connectedPeers = rooms[room]
    for (const [socketIDConnected, _socketConnected] of _connectedPeers.entries()) {
      // don't send to self: sender: data.socketID.local, every connected peer: socketIDConnected
      if(socketIDConnected !== data.socketID.local) {  // for every connected peer who is not the sender
        log(`online-peer: -- ${socketIDConnected} -- emitted to the socket  ${data.socketID.local}`)
        console.log(`online-peer: -- ${socketIDConnected} -- emitted to the socket  ${data.socketID.local}`)

        socket.emit('online-peer', socketIDConnected)  // connected peer의 정보를 하나씩 하나씩 보낸다.
      }
    }
  })

  socket.on('offer', (data) => {
    log(`${socket.id} said: offer`)
    console.log(`${socket.id} said: offer`)
    const _connectedPeers = rooms[room]
    // send to the other peer(s) if any.  // sender: data.socketID.local. connected peer: socketID
    for (const [socketIDConnected, socketConnected] of _connectedPeers.entries()) {
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
    const _connectedPeers = rooms[room]
    // send to the other peer(s) if any.  // sender: data.socketID.local. connected peer: socketID
    for (const [socketIDConnected, socketConnected] of _connectedPeers.entries()) {
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

    // data {
    //   socketID: {
    //     local: '/webrtcPeer#Es1CGVG7zEb9i_zfAAAB',
    //     remote: '/webrtcPeer#0n9F4vwjUPBrWKLHAAAA'
    //   },
    //   payload: {
    //     candidate: 'candidate:1670160373 1 udp 2122260223 172.28.160.1 54333 typ host generation 0 ufrag ivBu network-id 2',
    //     sdpMid: '0',
    //     sdpMLineIndex: 0
    //   }
    // }

    // console.log(`data`, data)

    const _connectedPeers = rooms[room]

    // send candidate to the other peer(s) if any
    for (const [socketIDConnected, socketConnected] of _connectedPeers.entries()) {
      // don't send to self
      //console.log(`Signaling Server sent candidate to ${socketIDConnected} with data.payload: {candidate: ${data.payload}, socketID: ${data.scoketID.local}} `)
      if (socketIDConnected === data.socketID.remote) {
        log(`Signaling Server sent candidate to ${socketIDConnected} with data.payload: {candidate: ${data.payload}, socketID: ${data.socketID.local}} `)
        console.log(`Signaling Server sent candidate to ${socketIDConnected} with data.payload: {candidate: ${data.payload}, socketID: ${data.socketID.local}} `)
        socketConnected.emit('candidate', {
          candidate: data.payload, 
          socketID: data.socketID.local
        })
      }
    }
  })
})