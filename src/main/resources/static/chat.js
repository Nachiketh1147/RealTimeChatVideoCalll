// chat.js — per-peer remote video elements (1:1 or multi-peer)
let stompClient = null;
let username = null;
let currentRoom = null;
let localStream = null;
// store peer connections keyed by remote username
const peers = {};

// connect STOMP
function connect() {
  const socket = new SockJS('/ws');
  stompClient = Stomp.over(socket);
  stompClient.debug = null;
  stompClient.connect({}, frame => {
    console.log('STOMP connected', frame);
    stompClient.subscribe('/user/queue/messages', m => appendMessage(JSON.parse(m.body)));
    stompClient.subscribe('/user/queue/signaling', m => handleSignal(JSON.parse(m.body)));
    refreshUsers();
  });
}

function login() {
  username = document.getElementById('username').value.trim();
  if (!username) return alert('Enter username');
  stompClient.send('/app/chat.send', {}, JSON.stringify({
    roomId: 'presence', fromUser: username, content: username + ' online'
  }));
  refreshUsers();
}

function refreshUsers(){
  fetch('/api/users').then(r=>r.json()).then(list=>{
    const ul = document.getElementById('users'); ul.innerHTML='';
    list.forEach(u=>{
      const li = document.createElement('li');
      const dot = document.createElement('span');
      dot.className = 'user-dot';
      dot.style.background = u.online ? 'linear-gradient(90deg,#10b981,#06b6d4)' : '#cbd5e1';
      const name = document.createElement('div');
      name.className = 'user-name';
      name.textContent = u.username;
      li.appendChild(dot); li.appendChild(name);
      ul.appendChild(li);
    });
  });
}

function joinRoom(){
  const r = document.getElementById('roomInput').value.trim();
  if(!r) return alert('Enter room');
  currentRoom = r;
  document.getElementById('roomTitle').textContent = 'Room: ' + r;
  stompClient.subscribe('/topic/room.'+r, m => appendMessage(JSON.parse(m.body)));
  stompClient.subscribe('/topic/room.'+r + '.signal', m => handleSignal(JSON.parse(m.body)));
  document.getElementById('chatBox').innerHTML = ''; document.getElementById('chatBox').classList.remove('empty');
}

// send chat message
function sendMessage(){
  const text = document.getElementById('msgInput').value.trim();
  if(!text || !currentRoom) return alert('Join a room and write a message');
  const msg = {roomId: currentRoom, fromUser: username, content: text};
  stompClient.send('/app/chat.send', {}, JSON.stringify(msg));
  document.getElementById('msgInput').value='';
}

function appendMessage(m){
  const box = document.getElementById('chatBox');
  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex'; wrapper.style.flexDirection = 'column';
  const bubble = document.createElement('div');
  bubble.className = 'msg ' + ((username && m.fromUser===username) ? 'me' : 'you');
  bubble.innerHTML = `<strong style="display:block;margin-bottom:6px;font-size:13px">${m.fromUser}</strong>
                      <div>${escapeHtml(m.content)}</div>
                      <div class="msg-meta ${m.fromUser===username? '' : 'you'}">${new Date(m.timestamp||Date.now()).toLocaleTimeString()}</div>`;
  wrapper.appendChild(bubble); box.appendChild(wrapper); box.scrollTop = box.scrollHeight;
}
function escapeHtml(text){ if(!text) return ''; return text.replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"}[m])); }

// ---------- WebRTC helpers ----------

// create an RTCPeerConnection for a given remote user
function createPeerFor(remoteUser) {
  if (peers[remoteUser]) return peers[remoteUser];

  const pc = new RTCPeerConnection();

  // add local tracks if available
  if (localStream) localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

  // when remote track arrives, attach to per-user video element
  pc.ontrack = event => {
    const [stream] = event.streams;
    attachRemoteStream(remoteUser, stream);
  };

  pc.onicecandidate = event => {
    if (event.candidate) {
      const sig = { type: 'ice', from: username, to: remoteUser, roomId: currentRoom, data: event.candidate };
      stompClient.send('/app/signaling', {}, JSON.stringify(sig));
    }
  };

  pc.onconnectionstatechange = () => {
    console.log('PC state for', remoteUser, pc.connectionState);
    if (['failed','disconnected','closed'].includes(pc.connectionState)) {
      removeRemoteVideo(remoteUser);
      try{ pc.close(); }catch(e){}
      delete peers[remoteUser];
    }
  };

  peers[remoteUser] = pc;
  return pc;
}

// attach a remote stream to a new video element for the remote user
function attachRemoteStream(remoteUser, stream) {
  // create container if not exists
  const container = document.getElementById('remoteVideos');
  if (!container) return console.warn('remoteVideos container missing');

  let remoteEl = document.getElementById('remote-' + remoteUser);
  if (!remoteEl) {
    const wrap = document.createElement('div');
    wrap.className = 'video-wrap large';
    wrap.id = 'wrap-' + remoteUser;

    const vid = document.createElement('video');
    vid.id = 'remote-' + remoteUser;
    vid.autoplay = true;
    vid.playsInline = true;
    vid.controls = false;

    const label = document.createElement('div');
    label.className = 'video-label';
    label.textContent = remoteUser;

    wrap.appendChild(vid);
    wrap.appendChild(label);
    container.appendChild(wrap);
    remoteEl = vid;
  }
  remoteEl.srcObject = stream;
}

// remove remote video element for a user
function removeRemoteVideo(remoteUser) {
  const wrap = document.getElementById('wrap-' + remoteUser);
  if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
}

// start a call: create offer and send to room (room receivers will answer directly)
async function startCall(){
  if(!currentRoom) return alert('Join a room first');
  await initLocalStream();
  // Create offer using a dedicated pc (we'll keep it in peers['__main__'])
  const pc = new RTCPeerConnection();
  if (localStream) localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

  pc.ontrack = event => {
    const [stream] = event.streams;
    // for 1:1 simple tests, attach to a "caller-remote" element OR the first remote user who answers
    // but our improved handler below will create per-user remote on answer
    // so we do not set remote here
    console.log('caller pc got remote track', event);
  };

  pc.onicecandidate = e => {
    if(e.candidate){
      const sig = { type:'ice', from: username, roomId: currentRoom, data:e.candidate };
      stompClient.send('/app/signaling', {}, JSON.stringify(sig));
    }
  };

  peers['__main__'] = pc;

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // broadcast offer to room; receivers will answer directly to 'from'
  const sig = { type:'offer', from: username, roomId: currentRoom, data: offer };
  stompClient.send('/app/signaling', {}, JSON.stringify(sig));
}

// initialize local camera/mic and show locally
async function initLocalStream(){
  if(localStream) return;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    document.getElementById('localVideo').srcObject = localStream;
  } catch (e) {
    alert('Camera/Microphone access required: ' + e.message);
    throw e;
  }
}

// handle signaling messages
async function handleSignal(msg){
  // ignore messages not for us (if msg.to is present)
  if (msg.to && msg.to !== username) return;

  if (msg.type === 'offer') {
    // someone offered — create peer for that remote and answer
    const remote = msg.from;
    await initLocalStream();
    const pc = createPeerFor(remote);
    await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    // send answer directly to the offerer
    const sig = { type:'answer', from: username, to: remote, roomId: currentRoom, data: answer };
    stompClient.send('/app/signaling', {}, JSON.stringify(sig));
  } else if (msg.type === 'answer') {
    // answer to our offer — set remote on the main pc or create peer
    const fromUser = msg.from;
    // if we have main pc (peers['__main__']) set remote desc on it
    if (peers['__main__']) {
      await peers['__main__'].setRemoteDescription(new RTCSessionDescription(msg.data));
    } else {
      // fallback: create or get peer for fromUser and set remote
      const pc = createPeerFor(fromUser);
      await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
    }
  } else if (msg.type === 'ice') {
    try {
      // ICE might be for a specific peer (msg.to) or for main
      if (msg.to) {
        // ICE targeted to this user: add to the pc for the sender (when they are answering us)
        const pc = peers[msg.from] || peers['__main__'];
        if (pc) await pc.addIceCandidate(msg.data);
      } else {
        // no 'to' — try main first, otherwise per remote
        const pc = peers['__main__'] || peers[msg.from] || Object.values(peers)[0];
        if (pc) await pc.addIceCandidate(msg.data);
      }
    } catch(e) {
      console.warn('Failed to add ICE candidate', e);
    }
  }
}

function hangup(){
  Object.keys(peers).forEach(k => {
    try{ peers[k].close(); }catch(e){}
    delete peers[k];
  });
  // remove remote videos
  const container = document.getElementById('remoteVideos');
  if (container) container.innerHTML = '';
  if(localStream){ localStream.getTracks().forEach(t=>t.stop()); localStream=null; document.getElementById('localVideo').srcObject=null; }
}

// wire up buttons & connect
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginBtn').addEventListener('click', login);
  document.getElementById('joinRoom').addEventListener('click', joinRoom);
  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  document.getElementById('startCall').addEventListener('click', startCall);
  document.getElementById('hangup').addEventListener('click', hangup);
  connect();
});
