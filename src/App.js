import React, { Component } from "react";

import io from "socket.io-client";

class App extends Component {
  constructor(props) {
    super(props);

    // https://reactjs.org/docs/refs-and-the-dom.html
    this.localVideoref = React.createRef();
    this.remoteVideoref = React.createRef();

    this.socket = null;
    this.candidates = [];
  }

  componentDidMount = () => {
    const token = "TOKEN";

    // 실제로 요청은 다음과 같은 형태이다.
    // http://localhost:8080/webrtc/?token=TOKEN&EIO=3&transport=polling&t=OHDRWN8   확인요망
    this.socket = io(
      "/webrtcPeer", // namespace, "http://localhost:8080/webrtcPeer"
      {
        path: "/webrtc", // server의 path와 동일해야 한다.
        query: { token }, // server에서 client socket, socket.handshake.query.token에서 찾아 볼 수 있다.
      }
    );

    this.socket.on("log", function (array) {
      console.log.apply(console, array);
    });

    this.socket.on("connection-success", (success) => {
      console.log(success);
    });

    this.socket.on("offerOrAnswer", (sdp) => {
      console.log("A sdp is received and written to textarea");

      this.textref.value = JSON.stringify(sdp);
    });

    this.socket.on("candidate", (candidate) => {
      // console.log('From Peer... ', JSON.stringify(candidate))
      console.log("A candidate is received and added to candidates[...]");

      this.candidates = [...this.candidates, candidate];

      //this.pc.addIceCandidate(new RTCIceCandidate(candidate))
    });

    //const pc_config = null

    const pc_config = {
      iceServers: [
        // {
        //   urls: 'stun:[STUN_IP]:[PORT]',
        //   'credentials': '[YOR CREDENTIALS]',
        //   'username': '[USERNAME]'
        // },
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    };

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection
    // create an instance of RTCPeerConnection
    this.pc = new RTCPeerConnection(pc_config);

    // triggered when a new candidate is returned
    this.pc.onicecandidate = (e) => {
      // send the candidates to the remote peer
      // see addCandidate below to be triggered on the remote peer
      if (e.candidate) {
        //console.log(JSON.stringify(e.candidate))
        console.log(`A new candidate ${JSON.stringify(e.candidate)} is triggered`);
        this.sendToPeer("candidate", e.candidate);
      }
    };

    // triggered when there is a change in connection state
    this.pc.oniceconnectionstatechange = (e) => {
      console.log(`A change ${e} in connection state is triggered`);
    };

    // triggered when a stream is added to pc, see below - this.pc.addStream(stream)
    this.pc.onaddstream = (e) => {
      console.log(`A stream ${e} is added(triggered)`);
      this.remoteVideoref.current.srcObject = e.stream;
    };

    // called when getUserMedia() successfully returns - see below
    // getUserMedia() returns a MediaStream object (https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)
    const success = (stream) => {
      window.localStream = stream;
      this.localVideoref.current.srcObject = stream;
      this.pc.addStream(stream);
    };

    // called when getUserMedia() fails - see below
    const failure = (e) => {
      console.log("getUserMedia Error: ", e);
    };

    // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    // see the above link for more constraint options
    const constraints = {
      audio: false,
      video: true,
      // video: {
      //   width: 1280,
      //   height: 720
      // },
      // video: {
      //   width: { min: 1280 },
      // }
    };

    // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    navigator.mediaDevices.getUserMedia(constraints).then(success).catch(failure);
  };

  sendToPeer = (messageType, payload) => {
    this.socket.emit(messageType, {
      socketID: this.socket.id,
      payload,
    });
  };

  /* ACTION METHODS FROM THE BUTTONS ON SCREEN */

  createOffer = () => {
    console.log("Offer clicked");

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer
    // initiates the creation of SDP
    this.pc
      .createOffer({ offerToReceiveVideo: 1 }) // (1)
      .then((sdp) => {
        //console.log(`set sdp ${JSON.stringify(sdp)} to pc.localDescription`)
        console.log(`set sdp to pc.localDescription`);

        // set offer sdp as local description
        return this.pc.setLocalDescription(sdp); //  (2)
      })
      .then(() => {
        //console.log(`check if sdp is the same: pc.localDescription - ${JSON.stringify(this.pc.localDescription)}`)
        this.sendToPeer("offerOrAnswer", this.pc.localDescription); // (3),   (1) 과 (2) 과 (3)의 수행 순서가 보장되어야 한다.
      })
      .catch((error) => {
        this.logError(error);
      });
  };

  // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createAnswer
  // creates an SDP answer to an offer received from remote peer
  createAnswer = () => {
    console.log("Answer clicked");
    this.pc
      .createAnswer({ offerToReceiveVideo: 1 }) // (1)
      .then((sdp) => {
        //console.log(`set sdp - ${JSON.stringify(sdp)} to pc.localDescription`)
        console.log(`set sdp to pc.localDescription`);

        // set answer sdp as local description
        return this.pc.setLocalDescription(sdp); // (2)
      })
      .then(() => {
        //console.log(`check if sdp is the same: pc.localDescription - ${JSON.stringify(this.pc.localDescription)}`)
        this.sendToPeer("offerOrAnswer", this.pc.localDescription); // (3),   (1) 과 (2) 과 (3)의 수행 순서가 보장되어야 한다.
      })
      .catch((error) => {
        this.logError(error);
      });
  };

  setRemoteDescription = () => {
    console.log("Set Remote Desc clicked");
    // retrieve and parse the SDP copied from the remote peer
    const desc = JSON.parse(this.textref.value);

    console.log(`desc (sdp) in text area start to be set to pc.remoteDescription `);
    // set sdp as remote description
    this.pc.setRemoteDescription(new RTCSessionDescription(desc), (error) => this.logError(error));
  };

  addCandidate = () => {
    console.log("Add Candidate clicked");
    // retrieve and parse the Candidate copied from the remote peer
    // const candidate = JSON.parse(this.textref.value)
    // console.log('Adding candidate:', candidate)

    // add the candidate to the peer connection
    // this.pc.addIceCandidate(new RTCIceCandidate(candidate))

    this.candidates.forEach((candidate) => {
      // const candidateString = JSON.stringify(candidate)
      console.log(
        `Client [this.pc.addIceCandidate(new RTCIceCandidate(candidate))] \n\tadd the candidate to the peer connection: `
      );
      this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    });
  };

  logError = (err) => {
    if (!err) return;
    if (typeof err === "string") {
      console.warn(err);
    } else {
      console.warn(err.toString(), err);
    }
  };

  render() {
    return (
      <div>
        <video
          style={{
            width: 240,
            height: 240,
            margin: 5,
            backgroundColor: "black",
          }}
          ref={this.localVideoref}
          autoPlay
        ></video>
        <video
          style={{
            width: 240,
            height: 240,
            margin: 5,
            backgroundColor: "black",
          }}
          ref={this.remoteVideoref}
          autoPlay
        ></video>
        <br />

        <button onClick={this.createOffer}>Offer</button>
        <button onClick={this.createAnswer}>Answer</button>

        <br />
        <textarea
          style={{ width: 450, height: 40 }}
          ref={(ref) => {
            this.textref = ref;
          }}
        />

        <br />
        <button onClick={this.setRemoteDescription}>Set Remote Desc</button>
        <button onClick={this.addCandidate}>Add Candidate</button>
      </div>
    );
  }
}

export default App;
