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

## Part 3-2 Offer and Answer Buttons only 
Offer and Answer Buttons 만 남기고 다른 버튼은 제거하였다.
Add Candidate 버튼과 Set Remote Desc을 제거하여, 자동화하였다. 
즉 메시지를 시그널서버로부터 받으면 해당 태스크가 자동으로 수행되도록 
수정하였다.  

dotenv@8.2.0 은 작동하지 않는다. dotenv@8.0.0은 잘된다.