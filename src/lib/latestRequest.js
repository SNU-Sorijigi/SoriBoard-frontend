// 카드별 최신 요청 표시. 요청 하나가 여러 카드를 덮을 수 있고(전체 로드),
// 카드 하나만 다시 불러올 수도 있다(주별/월별 → 다양성만).
// 각 카드는 자기를 덮는 가장 새 요청의 응답만 반영한다. 그래서 다양성만 다시 부른 요청이
// 진행 중인 전체 로드의 다른 카드를 버리지 않고, 그 전체 로드의 오래된 다양성 응답에 덮이지도 않는다.
// 더 이상 어느 카드의 최신도 아닌 요청은 취소한다(signal): 그 응답은 어차피 버려지므로, 새 보기의
// 요청이 브라우저의 대기열에서 그 뒤에 서지 않게 한다.

export function createLatestRequests() {
	let lastId = 0;
	/** @type {Map<string, number>} */
	const latest = new Map();
	/** @type {{ id: number, keys: string[], controller: AbortController }[]} */
	let pending = [];
	/**
	 * @param {number} id
	 * @param {string[]} keys
	 */
	const stale = (id, keys) => !keys.some((key) => latest.get(key) === id);
	return {
		// keys 를 덮는 새 요청을 시작하고 그 id 를 돌려준다. 이로써 어느 카드의 최신도 아니게 된 요청은 취소한다.
		/** @param {string[]} keys */
		begin(keys) {
			const id = ++lastId;
			for (const key of keys) latest.set(key, id);
			const kept = [];
			for (const entry of pending) {
				if (stale(entry.id, entry.keys)) entry.controller.abort();
				else kept.push(entry);
			}
			pending = kept;
			return id;
		},
		// id 가 아직 key 를 덮는 가장 새 요청인가.
		/**
		 * @param {string} key
		 * @param {number} id
		 */
		isLatest(key, id) {
			return latest.get(key) === id;
		},
		// id 의 요청 가운데 keys 를 그리는 것에 줄 AbortSignal. keys 가운데 어느 것도 id 가 최신이 아니게 되면
		// 취소된다(이미 그렇다면 취소된 채로 돌려준다). 한 카드라도 아직 이 요청을 기다리면 취소하지 않는다.
		/**
		 * @param {number} id
		 * @param {string[]} keys
		 * @returns {AbortSignal}
		 */
		signal(id, keys) {
			const controller = new AbortController();
			if (stale(id, keys)) controller.abort();
			else pending.push({ id, keys, controller });
			return controller.signal;
		}
	};
}
