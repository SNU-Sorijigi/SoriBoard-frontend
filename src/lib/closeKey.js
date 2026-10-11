// 모달의 × (role="button" span) 에 쓰는 keydown 핸들러를 만든다.
// Enter / Space (버튼 동작) 와 Escape 만 모달을 닫고, Tab·Shift·방향키 등은
// 무시한다. 그래서 × 에 포커스가 있을 때 Tab 으로 지나가도 입력이 날아가지 않는다.

const CLOSE_KEYS = ['Enter', ' ', 'Escape'];

export function closeOnKey(close) {
	return (event) => {
		if (!CLOSE_KEYS.includes(event.key)) {
			return;
		}
		event.preventDefault();
		close();
	};
}
