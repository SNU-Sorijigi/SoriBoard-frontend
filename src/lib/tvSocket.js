// 세션 페이지에서 TV 로 보내는 버튼 (곡 띄우기, 기기 휴식, 운영 종료, 판서 적용) 의 소켓.
// 백엔드 재시작이나 네트워크 끊김으로 소켓이 닫혔으면 클릭할 때 새로 열고, 열리면 보낸다.
// 아직 연결 중일 때의 클릭도 열리면 보낸다. 새 소켓이 열리지 못하면 한 번 알린다.
import { webSocketServer } from '$lib/globals';

export function tvSender() {
	let ws;
	let pending = [];

	function connect() {
		const socket = new WebSocket(`${webSocketServer}/ws/tv_display/`);
		socket.addEventListener('open', () => {
			pending.forEach((message) => socket.send(message));
			pending = [];
		});
		socket.addEventListener('close', () => {
			// 클릭을 기다리던 소켓만 알린다: 교체된 소켓이나 닫힌 컴포넌트의 소켓은 조용히 닫힌다
			if (socket !== ws || pending.length === 0) return;
			pending = [];
			alert('TV에 보내지 못했습니다.');
		});
		ws = socket;
	}

	function send(...messages) {
		const data = messages.map((message) => JSON.stringify(message));
		if (ws.readyState === WebSocket.OPEN) {
			data.forEach((message) => ws.send(message));
			return;
		}
		pending.push(...data);
		if (ws.readyState !== WebSocket.CONNECTING) connect();
	}

	// 컴포넌트와 함께 닫는다: 열린 소켓은 탭을 새로 고칠 때까지 모든 TV 업데이트를 받는다
	function close() {
		pending = [];
		ws.close();
	}

	connect();
	return { send, close };
}
