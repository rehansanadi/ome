// const { trace } = require("../../Server/routes/router");

let localStream;
let username;
let remoteUser;
let url = new URL(window.location.href);
// username = url.searchParams.get("username");
// remoteUser = url.searchParams.get("remoteuser");

let peerConnection;
let remoteStream;
let sendChannel;
let receiveChannel;
var msgInput = document.querySelector("#msg-input");
var msgSendBtn = document.querySelector(".msg-send-button");
var chatTextArea = document.querySelector(".chat-text-area");
var omeID = localStorage.getItem("omeID");

if (omeID) {
  username = omeID;
  $.ajax({
    url:"/new-user-update/"+omeID+"",
    type:"PUT",
    success: function(response){
      alert(response);
    },
  
  });
} else {
  var postData = "Demo Data";
  $.ajax({
    type: "POST",
    url: "/api/users",
    data: postData,
    success: function (response) {
      console.log(response);
      localStorage.setItem("omeID", response);
      username = response;
    },
    error: function (error) {
      console.log(error);
    },
  });
}



let init = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  document.getElementById("user-1").srcObject = localStream;

  $.post("http://localhost:8080/get-remote-users", {omeID: omeID})
  .done(function(data){
    if(data[0]){
      if(data[0]._id == remoteUser || data[0]._id == username){

      }else{
        remoteUser =  data[0]._id
      }
    }
    createOffer();
  })
  .fail(function(xhr, textStatus, errorThrown){
    console.log(xhr.responseText)
  });
};

init();

let socket = io.connect();

socket.on("connect", () => {
  if (socket.connected) {
    socket.emit("userconnect", {
      displayName: username,
    });
  }
});

let servers = {
  iceServers: [
    {
      urls: ["stun:stun1.1.google.com:19302", "stun:stun2.1.google.com:19302"],
    },
  ],
};

let createPeerConnection = async () => {
  peerConnection = new RTCPeerConnection(servers);

  remoteStream = new MediaStream();

  document.getElementById("user-2").srcObject = remoteStream;

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });
  peerConnection.ontrack = async (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  remoteStream.oninactive = () => {
    remoteStream.getTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    peerConnection.close();
  };

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      socket.emit("candidateSentToUser", {
        username: username,
        remoteUser: remoteUser,
        iceCandidateData: event.candidate,
      });
    }
  };

  sendChannel = peerConnection.createDataChannel("sendDataChannel");
  sendChannel.onopen = () => {
    console.log("data channel is open and ready to use");
    onSendChannelStateChange();
  };
  // sendChannel.onmessage = onSendChannelMessageCallBack;
  peerConnection.ondatachannel = receiveChannelCallBack;
};

function receiveChannelCallBack(event) {
  console.log("receive channel callback ");
  receiveChannel = event.channel;
  receiveChannel.onmessage = onReceiveChannelMessageCallBack;
  receiveChannel.onopen = onReceiveChannelStateChange;
  receiveChannel.onclose = onReceiveChannelStateChange;
}

function onReceiveChannelMessageCallBack(event) {
  console.log("received message");
  chatTextArea.innerHTML +=
    "<div style='margin-top:2px; margin-bottom:2px;'><b>Stranger: </b>" +
    event.data +
    "</div>";
}

function onReceiveChannelStateChange() {
  const readyState = receiveChannel.readyState;
  console.log("send channel state is:" + readyState);
  if (readyState === "open") {
    console.log(
      "data channel ready state is open - onReceiveChannelStateChange"
    );
  } else {
    console.log(
      "data channel ready state is not open - onReceiveChannelStateChange"
    );
  }
}

function sendData() {
  const msgData = msgInput.value;
  chatTextArea.innerHTML +=
      "<div style='margin-top:2px; margin-bottom:2px;'><b>Myself: </b>" +
      msgData +
      "</div>";
  if (sendChannel && sendChannel.readyState === 'open') {
      sendChannel.send(msgData);
  } else {
      console.log('DataChannel not open');
  }
}


function onSendChannelStateChange() {
  const readyState = sendChannel.readyState;
  console.log("send channel state is:" + readyState);
  if (readyState === "open") {
    console.log("data channel ready state is open - onSendChannelStateChange");
  } else {
    console.log(
      "data channel ready state is not open - onSendChannelStateChange"
    );
  }
}

let createOffer = async () => {
  createPeerConnection();
  let offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("offerSentToRemote", {
    username: username,
    remoteUser: remoteUser,
    offer: peerConnection.localDescription,
  });
};

let createAnswer = async (data) => {
  remoteUser = data.username;

  createPeerConnection();
  await peerConnection.setRemoteDescription(data.offer);
  let answer = await peerConnection.createAnswer();

  await peerConnection.setLocalDescription(answer);

  socket.emit("answerSentToUser1", {
    answer: answer,
    sender: data.remoteUser,
    receiver: data.username,
  });
};

socket.on("ReceiveOffer", function (data) {
  createAnswer(data);
});

let addAnswer = async (data) => {
  if (!peerConnection.currentRemoteDescription) {
    peerConnection.setRemoteDescription(data.answer);
  }
};

socket.on("ReceiveAnswer", function (data) {
  addAnswer(data);
});

socket.on("candidateReceiver", function (data) {
  peerConnection.addIceCandidate(data.iceCandidateData);
});

msgSendBtn.addEventListener("click", function (event) {
  sendData();
});


window.addEventListener("unload", function (event){
  $.ajax ({
    url:"/leaving-user-update/"+username+"",
    type:"PUT",
    success: function(response){
      alert(response);
    },
  });

});