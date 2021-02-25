
const express = require('express')

var io = require('socket.io')
({
  path: '/webrtc'
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

// https://www.tutorialspoint.com/socket.io/socket.io_namespaces.htm
const peers = io.of('/webrtcPeer')

// keep a reference of all socket connections
let connectedPeers = new Map()

peers.on('connection', socket => {

  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }

  log(`Server created socket with socketID: ${socket.id}`);
  console.log(`Server created socket with socketID: ${socket.id}`);

  socket.emit('connection-success', { success: socket.id })

  connectedPeers.set(socket.id, socket)

  socket.on('disconnect', () => {
    log(`${socket.id} disconnected`)
    console.log(`${socket.id} disconnected`)
    connectedPeers.delete(socket.id)
  })

  socket.on('offerOrAnswer', (data) => {
    log(`${socket.id} said: offerOrAnswer`)
    console.log(`${socket.id} said: offerOrAnswer`)
    // send to the other peer(s) if any
    for (const [socketID, socket] of connectedPeers.entries()) {
      // don't send to self
      if (socketID !== data.socketID) {
        log(`Signaling Server sent offerOrAnswer to ${socketID} with data.payload.type: ${data.payload.type}`)
        console.log(`Signaling Server sent offerOrAnswer to ${socketID} with data.payload.type: ${data.payload.type}`)
        socket.emit('offerOrAnswer', data.payload)
      }
    }
  })

  socket.on('candidate', (data) => {
    log(`${socket.id} said: candidate`)
    console.log(`${socket.id} said: candidate`)

    // send candidate to the other peer(s) if any
    for (const [socketID, socket] of connectedPeers.entries()) {
      // don't send to self
      if (socketID !== data.socketID) {
        log(`Signaling Server sent candidate to ${socketID} with data.payload: ${data.payload}`)
        console.log(`Signaling Server sent candidate to ${socketID} with data.payload: ${data.payload}`)
        socket.emit('candidate', data.payload)
      }
    }
  })

})