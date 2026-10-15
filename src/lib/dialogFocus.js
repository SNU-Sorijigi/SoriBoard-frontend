// 모달 (tabindex="-1") 에 쓰는 action: 열리면 키보드 포커스를 모달로 옮기고, 닫히면 연 버튼으로 돌려준다.
// 모달은 페이지 맨 끝에 있어서, 옮기지 않으면 Tab 이 뒤의 페이지 (시간표 칸 등) 를 먼저 다 지난다.
// 바깥을 클릭해 닫았으면 포커스는 이미 클릭한 곳에 있으니 그대로 둔다.
// 닫는 함수 (× 와 같은 것) 를 넘기면 (use:dialogFocus={toggle}) 모달 안 어디서든 Escape 로 닫힌다.
// 한글 조합 중의 Escape (조합 취소) 와 × 가 이미 처리한 Escape 는 건너뛴다.

export function dialogFocus(node, close) {
	const opener = document.activeElement;
	const onKeydown = (event) => {
		if (event.key !== 'Escape' || event.isComposing || event.keyCode === 229) {
			return;
		}
		if (event.defaultPrevented || typeof close !== 'function') {
			return;
		}
		event.preventDefault();
		close();
	};
	node.addEventListener('keydown', onKeydown);
	node.focus();
	return {
		update(newClose) {
			close = newClose;
		},
		destroy() {
			node.removeEventListener('keydown', onKeydown);
			const focused = document.activeElement;
			if (focused !== document.body && focused !== null && !node.contains(focused)) {
				return;
			}
			if (opener && opener !== document.body && opener.isConnected) {
				opener.focus();
			}
		}
	};
}
