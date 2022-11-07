Details in the following YouTube videos ...

Part 1
https://youtu.be/h2WkZ0h0-Rc

Part 2
https://youtu.be/UMy6vV4tW00

Part3
https://youtu.be/znw78jlFxqA

## Part 1 and Part 2

npm run start

그리고 나서

두 개의 크롬 탭을 열고
A탭에서 Offer 클릭, sdp를 콘솔에서 카피, B탭의 텍스트 창에 복사, Set Remote Desc 클릭
B탭에서 Answer 클릭, sdp를 콘솔에서 카피, A탭의 텍스트 창에 복사, Set Remote Desc 클릭
A탭의 콘솔에서 candidate 한 개를 복사하여, B탭의 텍스트 창에 복사, Add Candidate를 클릭,
각 탭에 화면 두 개가 안보이면 다른 candidate를 선택하여 동일한 스텝을 반복한다.

## Part 3 Signaling Server Added

npm run build
node server.js

[CMD 창] ngrok http 8080

을 입력하면 로컬네트워크 터널 서버를 알려준다. 그 중에서 https로 시작하는 URL을 선택한다.
그리고 크롬창에서 A탭을 열고, 셀폰에서 LTE를 선택하고 크롬창에서 B탭을 연다. 리모트peer가 안나타난다.
셀폰에서 동일네트워크를 선택하고 크롬창에서 B탭을 연다. 리모트peer가 나타난다.

A탭에서 Offer 클릭, B탭에서 Set Remote Desc 클릭
B탭에서 Answer 클릭, A탭에서 Set Remote Desc 클릭
A 혹은 B 탭에서 Add Candidate 클릭

버그 발견 !

1. 비동기 문제 발생: 다음의 마이크로태스크의 순서는 보장되어야 한다.
   offer 혹은 answer를 sdp 형태로 만들고,
   그 sdp로 pc에 localDescription을 세팅하고,
   그 sdp를 다른 peer로 송부한다.

Limitation !

1. 두 peer가 동일 local area network에 있을 경우만 동작한다.

Part 3-1 에서 수정할 예정

## Part 3-1 Bug fixed and Limitation fixed

버그를 수정하였고, Limitation이 없도록 보강하였다.

## WebRTC 개발을 하기 위한 사전준비

https://doublem.org/webrtc-story-01/

## Using Web Sockets with Socket.io

https://jcho42.medium.com/using-web-sockets-with-socket-io-b1bdbf490703

##

```js
const app = require("express")();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  path: "/webrtc",
});

const PORT = 3000;

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/public/index.html");
});

http.listen(PORT, function () {
  console.log("listening on *:" + PORT);
});

const peers = io.of("/webrtcPeer");

io.on("connection", function (socket) {
  console.log("a user has connected!");
});
```

## [socket.io] 사용할 Client API

https://velog.io/@hyex/socket.io-%EC%82%AC%EC%9A%A9%ED%95%A0-Client-API

## 서로 다른 종류의 browser끼리 peer connection을 맺기 위해서는 webrtc-adapter를 install 해야 한다. 그리고 서로 다른 종류의 두 개의 browser가 동일한 video/audio stream을 동시에 사용할 수 없다. 즉 현재 사용하고 있는 컴퓨터에서 chrome과 edge를 열고 webrtc로 peer connection을 시도하면 연결이 되지 않는다. 현재 컴퓨터 chrome/edge/fireFox와 다른 컴퓨터/모바일의 chrome/edge/fireFox를 사용하여 실험하여야 한다.

https://github.com/webrtc/adapter
