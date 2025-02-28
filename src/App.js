import React, { Component } from 'react';

import io from 'socket.io-client'

import Video from './components/video'
import Videos from './components/videos'

import dotenv from 'dotenv';
dotenv.config();

//console.log("process.env.REACT_APP_WEBSERVER_URL: ", process.env.REACT_APP_WEBSERVER_URL);

class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
      localStream: null,    // used to hold local stream object to avoid recreating the stream everytime a new offer comes
      remoteStream: null,    // used to hold remote stream object that is displayed in the main screen

      remoteVideos: [],    // holds all Video Streams (all remote streams)
      peerConnections: {},  // holds all Peer Connections
      selectedVideo: null,

      status: 'Please wait...',

      pc_config: {
        "iceServers": [
          // {
          //   urls: 'stun:[STUN_IP]:[PORT]',
          //   'credentials': '[YOR CREDENTIALS]',
          //   'username': '[USERNAME]'
          // },
          {
            urls : 'stun:stun.l.google.com:19302'
          }
        ]
      },

      sdpConstraints: {
        'mandatory': {
            'OfferToReceiveAudio': true,
            'OfferToReceiveVideo': true
        }
      },

    }

    this.serviceIP = `${process.env.REACT_APP_WEBSERVER_URL}/webrtcPeer`;
    //this.serviceIP = 'https://03ebef4bea8d.ngrok.io/webrtcPeer'

    // https://reactjs.org/docs/refs-and-the-dom.html
    //this.localVideoref = React.createRef()
    //this.remoteVideoref = React.createRef()

    this.socket = null
    // this.candidates = []
  }

  getLocalStream = ()=>{
       // called when getUserMedia() successfully returns - see below
    // getUserMedia() returns a MediaStream object (https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)
    const success = (stream) => {
      window.localStream = stream
      //this.localVideoref.current.srcObject = stream
      this.setState({
        localStream: stream
      })

      this.whoisOnline()
      //this.pc.addStream(stream)
    }

    // called when getUserMedia() fails - see below
    const failure = (e) => {
      console.log('getUserMedia Error: ', e)
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    // see the above link for more constraint options
    const constraints = {
      // audio: false,
      video: true,
      // video: {
      //   width: 1280,
      //   height: 720
      // },
      // video: {
      //   width: { min: 1280 },
      // }
      options: {
        mirror: true,  // mirror ?? need googling.
      }
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    navigator.mediaDevices.getUserMedia(constraints)
      .then(success)
      .catch(failure)

  }

  whoisOnline = () => {
    // let all peers know I am joining
    this.sendToPeer('onlinePeers', null, {local: this.socket.id})
  }

  sendToPeer = (messageType, payload, socketID) => {
    this.socket.emit(messageType, {
      socketID,
      payload
    })
  }

  createPeerConnection = (socketID, callback) => {

    try {
      let pc = new RTCPeerConnection(this.state.pc_config)

      // add pc to peerConnections object
      const peerConnections = { ...this.state.peerConnections, [socketID]: pc }
      this.setState({
        peerConnections
      })

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          this.sendToPeer('candidate', e.candidate, {
            local: this.socket.id,
            remote: socketID
          })
        }
      }

      pc.oniceconnectionstatechange = (e) => {
        // if (pc.iceConnectionState === 'disconnected') {
        //   const remoteVideos = this.state.remoteVideos.filter(video => video.id !== socketID)

        //   this.setState({
        //      remoteStream: remoteVideos.length > 0 && remoteVideos[0].stream || null,
        //  })
        }
        
      pc.ontrack = (e) => {
        const remoteVideo = {
          id: socketID,
          name: socketID,
          stream: e.streams[0]
        }

        this.setState(prevState => {

          // If we already have a stream in display let it stay the same, otherwise use the latest stream
          const remoteStreamObj = prevState.remoteVideos.length > 0 ? {} : { remoteStream: e.streams[0] }

          // get currently selected video
          let selectedVideoObj = prevState.remoteVideos.filter(stream => stream.id === prevState.selectedVideo.id)
          // if the video is still in the list, then do nothing, otherwise set to new video stream
          selectedVideoObj = selectedVideoObj.length ? {} : { selectedVideo: remoteVideo }

          return {
            // selectedVideo: remoteVideo,
            ...selectedVideoObj,
            // remoteStream: e.streams[0],
            ...remoteStreamObj,
            remoteVideos: [...prevState.remoteVideos, remoteVideo]
          }
        })
      }

      pc.close = () => {
        // alert('GONE')
      }

      if (this.state.localStream)
        pc.addStream(this.state.localStream)

      // return pc
      callback(pc)
    } catch(e) {
      console.log('Something went wrong! pc not created!!', e)
      // return;
      callback(null)
    }
  }

  componentDidMount = () => {

    this.socket = io.connect(
      this.serviceIP,   // namespace
      {
        path: '/io/webrtc',
        query: {
           room: window.location.pathname,
        }
      }
    )

    this.socket.on('log', function (array) {
      console.log.apply(console, array);
    });

    this.socket.on('connection-success', data => {

      this.getLocalStream()

      console.log('connection-success: ', data.success);
      const status = data.peerCount > 1 ? `Total Connected Peers to room ${window.location.pathname}: ${data.peerCount}` : 'Waiting for other peers to connect'

      this.setState({
        status: status
      })
    })

    this.socket.on('joined-peers', data => {

      this.setState({
        status: data.peerCount > 1 ? `Total Connected Peers to room ${window.location.pathname}: ${data.peerCount}` : 'Waiting for other peers to connect'
      })
    })

    this.socket.on('peer-disconnected', data => {
      console.log('peer-disconnected', data)

      const remoteVideos = this.state.remoteVideos.filter(video => video.id !== data.socketID)

      this.setState(prevState => {
        // check if disconnected peer is the selected video and if there still connected peers, then select the first
        const selectedVideoObj = remoteVideos.length && prevState.selectedVideo.id === data.socketID ? { selectedVideo: remoteVideos[0] } : null

        return {
          // remoteStream: remoteVideos.length > 0 && remoteVideos[0].stream || null,
          remoteVideos,
          ...selectedVideoObj,
          status: data.peerCount > 1 ? `Total Connected Peers to room ${window.location.pathname}: ${data.peerCount}` : 'Waiting for other peers to connect'
        }
        }
      )
    })

    // this.socket.on('offerOrAnswer', (sdp) => {
    //   console.log('A sdp is received and written to textarea')
    //   this.textref.value = JSON.stringify(sdp)

    //   console.log(`A sdp starts to be set to pc.remoteDescription `)
    //   // set sdp as remote description
    //   this.pc.setRemoteDescription(new RTCSessionDescription(sdp), (error) => this.logError(error))
    // })

    this.socket.on('online-peer', socketID => {
      console.log('connected peers ...', socketID)

      // create and send offer to the peer (data.socketID)
      // 1. Create new pc
      this.createPeerConnection(socketID, pc => {
        // 2. Create Offer
          if (pc)
            pc.createOffer(this.state.sdpConstraints)
              .then(sdp => {
                pc.setLocalDescription(sdp)

                this.sendToPeer('offer', sdp, {
                  local: this.socket.id,
                  remote: socketID
                })
          })
        })
    })

    this.socket.on('offer', data => {
      this.createPeerConnection(data.socketID, pc => {
        pc.addStream(this.state.localStream)

        pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(() => {
          // 2. Create Answer
          pc.createAnswer(this.state.sdpConstraints)
            .then(sdp => {
              pc.setLocalDescription(sdp)

              this.sendToPeer('answer', sdp, {
                local: this.socket.id,
                remote: data.socketID
              })
            })
        })
      })
    })

    this.socket.on('answer', data => {
      // get remote's peerConnection
      const pc = this.state.peerConnections[data.socketID]
      console.log(data.sdp)
      pc.setRemoteDescription(new RTCSessionDescription(data.sdp)).then(()=>{})
    })

    this.socket.on('candidate', (data) => {
      // get remote's peerConnection
      const pc = this.state.peerConnections[data.socketID]

      if (pc)
        pc.addIceCandidate(new RTCIceCandidate(data.candidate))
    })

    // this.socket.on('candidate', (candidate) => {
    //   // console.log('From Peer... ', JSON.stringify(candidate))
    //   // console.log('A candidate is received and added to candidates[...]')

    //   // this.candidates = [...this.candidates, candidate]

    //   console.log(`Client [this.pc.addIceCandidate(new RTCIceCandidate(candidate))] \n\tadd the candidate to the peer connection: `)
    //   this.pc.addIceCandidate(new RTCIceCandidate(candidate))
    // })

    //const pc_config = null

    // const pc_config = {
    //   "iceServers": [
    //     // {
    //     //   urls: 'stun:[STUN_IP]:[PORT]',
    //     //   'credentials': '[YOR CREDENTIALS]',
    //     //   'username': '[USERNAME]'
    //     // },
    //     {
    //       urls : 'stun:stun.l.google.com:19302'
    //     }
    //   ]
    // }

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
    // create an instance of RTCPeerConnection
    // this.pc = new RTCPeerConnection(this.state.pc_config)

    // triggered when a new candidate is returned
    // this.pc.onicecandidate = (e) => {
      
    //   // send the candidates to the remote peer
    //   // see addCandidate below to be triggered on the remote peer
    //   if (e.candidate) {
    //     //console.log(JSON.stringify(e.candidate))
    //     console.log(`A new candidate ${JSON.stringify(e.candidate)} is triggered`)
    //     this.sendToPeer('candidate', e.candidate)
    //   }
    // }

    // triggered when there is a change in connection state
    // this.pc.oniceconnectionstatechange = (e) => {
    //   console.log(`A change ${e} in connection state is triggered`)
    // }

    // triggered when a stream is added to pc, see below - this.pc.addStream(stream)
    // this.pc.onaddstream = (e) => {
    //   console.log(`A stream ${e} is added(triggered)`)
    //   //this.remoteVideoref.current.srcObject = e.stream
    //   this.setState({
    //     remoteStream: e.stream,
    //   })
    // }

    // this.pc.ontrack = (e) => {
    //   debugger
    //   console.log(`An ontrack event ${e} is added(triggered) on track: `, e)
    //   console.log(`--- A stream[0] ${e.streams[0]}`, e.streams[0])
    //   //this.remoteVideoref.current.srcObject = e.streams[0]
    //   this.setState({
    //     remoteStream: e.streams[0],
    //   })
    // }
  }

  // sendToPeer = (messageType, payload) => {
  //   this.socket.emit(messageType, {
  //     socketID: this.socket.id,
  //     payload
  //   })
  // }



  logError = (err) => {
    if (!err) return;
    if (typeof err === 'string') {
      console.warn(err);
    } else {
      console.warn(err.toString(), err);
    }
  }

  switchVideo = (_video) => {
    console.log(`switchVideo main screen to clicked remoteVideo : `, _video)
    this.setState({
      selectedVideo: _video
    })
  }

  render() {

    console.log(this.state.localStream)

    const statusText = <div style={{ color: 'yellow', padding: 5 }}>{this.state.status}</div>

    return (
      <div>
        <Video
          videoStyles={{
            zIndex:2,
            position: 'absolute',
            right:0,
            width: 200,
            height: 200,
            margin: 5,
            backgroundColor: 'black'
          }}
          // ref={this.localVideoref}
          videoStream={this.state.localStream}
          autoPlay muted>
        </Video>
        <Video
          videoStyles={{
            zIndex: 1,
            position: 'fixed',
            bottom: 0,
            minWidth: '100%',
            minHeight: '100%',
            backgroundColor: 'black'
          }}
          // ref={ this.remoteVideoref }
          videoStream={this.state.selectedVideo && this.state.selectedVideo.stream}
          autoPlay>
        </Video>
        <br />
        <div style={{
          zIndex: 3,
          position: 'absolute',
          margin: 10,
          backgroundColor: '#cdc4ff4f',
          padding: 10,
          borderRadius: 5,
        }}>
          { statusText }
        </div>
        <div>
          <Videos
            switchVideo={this.switchVideo}
            remoteVideos={this.state.remoteVideos}
          ></Videos>
        </div>
        <br />

        {/* <div style={{zIndex: 1, position: 'fixed'}} >
          <button onClick={this.createOffer}>Offer</button>
          <button onClick={this.createAnswer}>Answer</button>

          <br />
          <textarea style={{ width: 450, height:40 }} ref={ref => { this.textref = ref }} />
        </div> */}
        {/* <br />
        <button onClick={this.setRemoteDescription}>Set Remote Desc</button>
        <button onClick={this.addCandidate}>Add Candidate</button> */}
      </div>
    )
  }
}

export default App;

  // new peer 가 조인을 하게 되면, 

  // 서버는 connection을 자동으로 감지하고 -- peers.on('connection') -- 
  // connectedPeers set에 new peer의 socket정보를 기록한 후
  // 그 new peer에게 connection-success를 송부한다. -- socket.emit('connection-success') --
  //      connection-success 메시지를 받은 new peer는 localStream을 얻는다. -- getLocalStream() --
  //      그 new peer는 서버에게 online으로 연결되어 있는 peers 들을 묻기 위해서 onlinePeers 메시지를 보낸다. 
  //      data.socketID.local에 자기의 socket.id를 넣어서 보낸다.
  // 그리고 모든 peers에게 joined-peers 메시지를 브로드캐스트한다. -- socket.broadcast.emit('joined-peers') --
  
  // 서버가 onlinePeers 메시지를 받으면, 서버는 이미 join한 peers들의 정보(현재 online으로 connection이 되어 있는 peer의 socketID)
  // 를 하나씩 읽어서, 이 메시지를 보낸(이 정보를 요청한) peer(data.socketID.local)에게 online-peer 메시지로 만들어서 송부한다. 
  // 즉 online에 connection이 되어 있는 피어의 socketID와 함께 보내준다. 
  // 이 정보를 요청한 peer의 socketID는 보낼 필요가 없으므로 제외한다. 
  //
  // online-peer 메시지를 받은 peer A는 online으로 connection된 peer B의 socketID를 알게 된다. -- 이 메시지를 connection되어 있는 peers들의 
  // 숫자만큼 받는다. -- 
  // peer A는 peer B와 peer connection(pc)을 생성한다. peer A는 pc.createOffer를 수행하여, 
  // sdp를 만들고,  
  // sdp를 local에 저장하고 -- pc.setLocalDescription(sdp) --
  // offer 메시지에 {payload:sdp, sockeID:{local: 자기의 this.socker.id, remote: peer B의 socketID} 를 담아서 서버에 보낸다.
  //
  // offer 메시지를 받은 서버는 .... <TBD>