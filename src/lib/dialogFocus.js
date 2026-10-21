// 모달 (tabindex="-1") 에 쓰는 action: 열리면 키보드 포커스를 모달로 옮기고, 닫히면 연 버튼으로 돌려준다.
// 모달은 페이지 맨 끝에 있어서, 옮기지 않으면 Tab 이 뒤의 페이지 (시간표 칸 등) 를 먼저 다 지난다.
// 바깥을 클릭해 닫았으면 포커스는 이미 클릭한 곳에 있으니 그대로 둔다.
// 닫는 함수 (× 와 같은 것) 를 넘기면 (use:dialogFocus={toggle}) 모달 안 어디서든 Escape 로 닫힌다.
// 한글 조합 중의 Escape (조합 취소) 와 × 가 이미 처리한 Escape 는 건너뛴다.
// Tab 은 모달 안에서 돈다: 마지막 칸에서 Tab 은 처음 칸 (×) 으로, 처음 칸이나 모달 자체에서
// Shift+Tab 은 마지막 칸으로. 뒤의 페이지는 흐리게 가려져 있어서, 거기로 나가면 보이지 않는
// 버튼에 포커스가 간다.

const FOCUSABLE = 'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]';

// tabindex="-1" (모달 자체 등) 은 Tab 순서에 없고, disabled 나 visibility: hidden / display: none 인 칸
// (예: 견습이 없을 때의 견습 출근 시간) 은 Tab 이 건너뛴다
function tabbable(node) {
	return [...node.querySelectorAll(FOCUSABLE)].filter(
		(el) =>
			!el.disabled &&
			!(Number(el.getAttribute('tabindex')) < 0) &&
			el.getClientRects().length > 0 &&
			getComputedStyle(el).visibility !== 'hidden'
	);
}

export function dialogFocus(node, close) {
	const opener = document.activeElement;
	const wrapTab = (event) => {
		if (event.altKey || event.ctrlKey || event.metaKey) {
			return;
		}
		const items = tabbable(node);
		const focused = document.activeElement;
		if (items.length === 0) {
			event.preventDefault();
			return;
		}
		const first = items[0];
		const last = items[items.length - 1];
		if (event.shiftKey && (focused === first || focused === node)) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && focused === last) {
			event.preventDefault();
			first.focus();
		}
	};
	const onKeydown = (event) => {
		if (event.defaultPrevented) {
			return;
		}
		if (event.key === 'Tab') {
			wrapTab(event);
			return;
		}
		if (event.key !== 'Escape' || event.isComposing || event.keyCode === 229) {
			return;
		}
		if (typeof close !== 'function') {
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
