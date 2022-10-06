import React, { useEffect, useRef, useState } from "react";

// import io from 'socket.io-client'

function App() {
  // https://reactjs.org/docs/refs-and-the-dom.html
  const localVideoref = useRef();
  const remoteVideoref = useRef();
  const pcRef = useRef();
  const textRef = useRef();

  // socket = null
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    console.log("Mounted");

    // socket = io(
    //   '/webrtcPeer',   // namespace
    //   {
    //     path: '/webrtc',
    //     query: {}
    //   }
    // )

    // socket.on('connection-success', success => {
    //   console.log(success)
    // })

    // socket.on('offerOrAnswer', (sdp) => {
    //   textRef.current.value = JSON.stringify(sdp)

    //   // set sdp as remote description
    //   pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp))
    // })

    // socket.on('candidate', (candidate) => {
    //   // console.log('From Peer... ', JSON.stringify(candidate))
    //   // candidates = [...candidates, candidate]
    //   pcRef.current.addIceCandidate(new RTCIceCandidate(candidate))
    // })

    const pc_config = null;

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
    pcRef.current = new RTCPeerConnection(pc_config);

    // triggered when a new candidate is returned
    pcRef.current.onicecandidate = (e) => {
      // send the candidates to the remote peer
      // see addCandidate below to be triggered on the remote peer
      if (e.candidate) {
        console.log(JSON.stringify(e.candidate));
        // sendToPeer('candidate', e.candidate)
      }
    };

    // triggered when there is a change in connection state
    pcRef.current.oniceconnectionstatechange = (e) => {
      console.log(e);
    };

    // triggered when a stream is added to pc, see below - pcRef.current.addStream(stream)
    // pcRef.current.onaddstream을 사용하면 remote stream이 나오지 않는다.
    // ontrack과 onaddstream의 차이는 무엇인가?
    pcRef.current.ontrack = (e) => {
      remoteVideoref.current.srcObject = e.streams[0]; // e.streams[0] 으로 정확히 사용하면 동작한다.
    };

    // triggered when a stream is added to pc, see below - pcRef.current.addStream(stream)
    // pcRef.current.onaddstream = (e) => {
    //   remoteVideoref.current.srcObject = e.stream
    // }

    // called when getUserMedia() successfully returns - see below
    // getUserMedia() returns a MediaStream object (https://developer.mozilla.org/en-US/docs/Web/API/MediaStream)
    const success = (stream) => {
      window.localStream = stream;
      localVideoref.current.srcObject = stream;
      pcRef.current.addStream(stream);
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
  });

  // sendToPeer = (messageType, payload) => {
  //   socket.emit(messageType, {
  //     socketID: socket.id,
  //     payload
  //   })
  // }

  // /* ACTION METHODS FROM THE BUTTONS ON SCREEN */

  const createOffer = () => {
    console.log("Offer");

    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer
    // initiates the creation of SDP
    pcRef.current.createOffer({ offerToReceiveVideo: 1 }).then((sdp) => {
      console.log(JSON.stringify(sdp));

      // set offer sdp as local description
      pcRef.current.setLocalDescription(sdp);

      // sendToPeer('offerOrAnswer', sdp)
    });
  };

  // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createAnswer
  // creates an SDP answer to an offer received from remote peer
  const createAnswer = () => {
    console.log("Answer");
    pcRef.current.createAnswer({ offerToReceiveVideo: 1 }).then((sdp) => {
      console.log(JSON.stringify(sdp));

      // set answer sdp as local description
      pcRef.current.setLocalDescription(sdp);

      // sendToPeer('offerOrAnswer', sdp)
    });
  };

  const setRemoteDescription = () => {
    // retrieve and parse the SDP copied from the remote peer
    const desc = JSON.parse(textRef.current.value);

    // set sdp as remote description
    pcRef.current.setRemoteDescription(new RTCSessionDescription(desc));
  };

  const addCandidate = () => {
    // retrieve and parse the Candidate copied from the remote peer
    const candidate = JSON.parse(textRef.current.value);
    console.log("Adding candidate:", candidate);

    // add the candidate to the peer connection
    pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));

    // candidates.forEach(candidate => {
    //   console.log(JSON.stringify(candidate))
    //   pcRef.current.addIceCandidate(new RTCIceCandidate(candidate))
    // });
  };

  return (
    <div>
      <video
        style={{
          width: 240,
          height: 240,
          margin: 5,
          backgroundColor: "black",
        }}
        ref={localVideoref}
        autoPlay
      ></video>
      <video
        style={{
          width: 240,
          height: 240,
          margin: 5,
          backgroundColor: "black",
        }}
        ref={remoteVideoref}
        autoPlay
      ></video>
      <br />

      <button onClick={createOffer}>Offer</button>
      <button onClick={createAnswer}>Answer</button>

      <br />
      <textarea style={{ width: 450, height: 40 }} ref={textRef} />

      <br />
      <button onClick={setRemoteDescription}>Set Remote Desc</button>
      <button onClick={addCandidate}>Add Candidate</button>
    </div>
  );
}

export default App;
