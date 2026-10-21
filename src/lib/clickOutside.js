// 모달 박스에 쓰는 action: 박스 바깥을 클릭하면 'outclick' 이벤트를 보낸다 (on:outclick={toggle}).
// 누른 곳과 뗀 곳이 다르면 브라우저는 둘의 공통 조상 (박스 바깥의 .modal) 에 click 을 보낸다.
// 그래서 박스 안에서 누른 채 끌어 바깥에서 떼면 (업로드 글 드래그 선택, 칸의 글자 선택) 모달이
// 닫혔다. 이제 박스 안에서 시작한 누름은 어디서 떼든 닫지 않는다.
// 키보드 클릭 (Enter / Space) 에는 mousedown 이 없으니, 기억한 누름은 click 마다 지운다.

export function clickOutside(node) {
	let pressedInside = false;
	const handleMouseDown = (event) => {
		pressedInside = node.contains(event.target);
	};
	const handleClick = (event) => {
		const startedInside = pressedInside;
		pressedInside = false;
		if (!startedInside && !node.contains(event.target)) {
			node.dispatchEvent(new CustomEvent('outclick'));
		}
	};

	document.addEventListener('mousedown', handleMouseDown, true);
	document.addEventListener('click', handleClick, true);

	return {
		destroy() {
			document.removeEventListener('mousedown', handleMouseDown, true);
			document.removeEventListener('click', handleClick, true);
		}
	};
}
