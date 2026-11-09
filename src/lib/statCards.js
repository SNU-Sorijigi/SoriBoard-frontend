// 통계 카드와 요청의 관계. 대부분의 카드는 자기 요청을 하나씩 갖지만,
// 다른 카드의 응답으로 그리는 카드도 있다(그 카드를 위해 따로 부르지 않는다).

// 카드 → 그 카드를 그리는 응답을 주는 요청.
// 시대별 분포는 다양성 응답의 summary.era 로 그린다(stats/eras 와 같은 수).
// 장르별 분포는 다양성 응답의 summary.genre 로 그린다(stats/genres 와 같은 분류).
// 선곡 다양성의 칸(시대·장르 다양성, 고유 곡 수)도 다양성 응답의 summary 로 그린다.
export const DERIVED_CARDS = {
	eras: 'diversity',
	genres: 'diversity',
	diversityTiles: 'diversity'
};

// 한 번의 로드가 덮는 카드들을 요청별로 묶는다: [[요청, [카드…]], …] (처음 나온 순서).
/**
 * @param {string[]} keys
 * @param {Record<string, string>} [derived]
 * @returns {[string, string[]][]}
 */
export function requestGroups(keys, derived = DERIVED_CARDS) {
	/** @type {Map<string, string[]>} */
	const groups = new Map();
	for (const key of keys) {
		const request = derived[key] ?? key;
		const cards = groups.get(request);
		if (cards) cards.push(key);
		else groups.set(request, [key]);
	}
	return [...groups];
}

// '다시 시도'로 다시 불러올 카드: card 를 그리는 요청이 그리는 카드 가운데 실패한 것(한 번의 요청으로).
// 다양성 요청이 실패했으면 시대·장르별 분포의 단추가 선곡 수·다양성 추이 카드와 선곡 다양성의 칸도 함께 불러온다.
// 불러온 카드는 건드리지 않는다.
/**
 * @param {string} card
 * @param {Record<string, string>} errors
 * @param {Record<string, string>} [derived]
 * @returns {string[]}
 */
export function retryKeys(card, errors, derived = DERIVED_CARDS) {
	const request = derived[card] ?? card;
	const cards = [request, ...Object.keys(derived).filter((key) => derived[key] === request)];
	return cards.filter((key) => errors[key]);
}

// 카드의 '다시 시도'와 함께 다시 부를 앞 학기 요청: keys 를 그리는 요청 가운데 실패한 것(처음 나온 순서, 한 번씩).
// 앞 학기의 요청 이름은 requestGroups 의 요청 이름과 같다(diversity, composers, …, firstWorks).
/**
 * @param {string[]} keys
 * @param {string[]} failed
 * @param {Record<string, string>} [derived]
 * @returns {string[]}
 */
export function previousRetryRequests(keys, failed, derived = DERIVED_CARDS) {
	return requestGroups(keys, derived)
		.map(([request]) => request)
		.filter((request) => failed.includes(request));
}

// 다양성 응답 → 장르별 분포 카드의 봉투({ filters, total_plays, labels, values }).
// summary 는 주별/월별 버킷과 무관하다. summary.genre 에는 총계가 없어 응답의 total_plays 를 쓴다.
/** @param {any} diversity */
export function genreDistribution(diversity) {
	const { labels, values } = diversity.summary.genre;
	return { filters: diversity.filters, total_plays: diversity.total_plays, labels, values };
}

// 다양성 응답 → 시대별 분포 카드의 봉투({ filters, total_plays, labels, values, unknown_share }).
// stats/eras 와 같은 수다: summary.era 는 '미상'을 빼고 주므로, 모든 선곡이 한 시대에 들어가는 만큼
// 총계에서 모자란 수(total_plays − 합)를 stats/eras 처럼 맨 뒤의 '미상'으로 붙인다(0 이면 붙이지 않는다).
/** @param {any} diversity */
export function eraDistribution(diversity) {
	const { labels, values, unknown_share } = diversity.summary.era;
	const unknown = diversity.total_plays - values.reduce((sum, v) => sum + v, 0);
	return {
		filters: diversity.filters,
		total_plays: diversity.total_plays,
		labels: unknown > 0 ? [...labels, '미상'] : [...labels],
		values: unknown > 0 ? [...values, unknown] : [...values],
		unknown_share
	};
}

// 다양성 응답 → 선곡 다양성의 칸(시대·장르 다양성, 고유 곡 수)이 읽는 summary.
// summary 는 버킷과 무관하므로 주별/월별만 바꾸면 칸은 그대로 둔다(다시 부르는 카드가 아니다).
/** @param {any} diversity */
export const diversityTiles = (diversity) => diversity.summary;

// 화면 낭독기에 알릴 로드 상태: 카드를 불러오는 동안은 비우고, 다 끝나면 실패한 카드의 이름(페이지 순서, 한 번씩)이나 다 불러왔음을 말한다.
/**
 * @param {Record<string, boolean>} loading
 * @param {Record<string, string>} errors
 * @param {[string, string][]} cards [카드, 이름] (페이지 순서)
 * @returns {string}
 */
export function loadStatusText(loading, errors, cards) {
	if (cards.some(([key]) => loading[key])) return '';
	const names = [...new Set(cards.filter(([key]) => errors[key]).map(([, name]) => name))];
	if (!names.length) return '모든 카드를 불러왔습니다.';
	return `카드 ${names.length.toLocaleString()}개를 불러오지 못했습니다: ${names.join(', ')}. 각 카드의 다시 시도로 다시 부를 수 있습니다.`;
}

// 로드 상태 뒤에 지난 학기 수치가 실패했다는 말(KPI 칸 아래 줄과 같은 말)을 붙인다: 상태가 비었거나(불러오는 중) 지난 학기 이름이 없으면 그대로 둔다.
/**
 * @param {string} status loadStatusText 등의 로드 상태
 * @param {string} label 실패한 지난 학기의 이름(예: '2025-2학기'), 실패하지 않았으면 ''
 * @returns {string}
 */
export function withPreviousFailure(status, label) {
	if (!status || !label) return status;
	return `${status} 지난 학기(${label})와 견준 수치를 불러오지 못했습니다. 지난 학기 수치 다시 시도로 다시 부를 수 있습니다.`;
}

// 고른 기간에 선곡이 없을 때 통계가 카드 대신 보이는 말(작곡가 페이지·학기 결산과 같은 말투). 전체 기간이면 '아직'.
// 개인에서는 그 지기의 선곡만 센 요약이므로 이 지기가 튼 곡이 없다고 한다. 견습 포함은 그 지기가 견습으로 든
// 타임도 세므로 '지기·견습으로'라고 한다(학기 결산의 reportEmptyText 와 같은 말).
/**
 * @param {{ wholePeriod: boolean, individual: boolean, includeMentees?: boolean }} view
 * @returns {string}
 */
export function emptyPeriodText({ wholePeriod, individual, includeMentees = false }) {
	const when = wholePeriod ? '아직' : '이 기간에는';
	if (!individual) return `${when} 선곡이 없습니다.`;
	return `${when} 이 지기가 ${includeMentees ? '지기·견습으로 ' : ''}튼 곡이 없습니다.`;
}

// 선곡이 없는 기간이면 로드 상태 대신 카드 대신 보이는 말을 한다(카드는 보이지 않으므로 그 실패도 말하지 않는다).
// 상태가 비었으면(불러오는 중) 그대로 둔다. 지난 학기의 말(withPreviousFailure)은 그 뒤에 붙인다.
/**
 * @param {string} status loadStatusText 의 로드 상태
 * @param {string | false | null | undefined} emptyText 선곡이 없는 기간의 말, 선곡이 있으면 거짓 값
 * @returns {string}
 */
export function withEmptyPeriod(status, emptyText) {
	return status && emptyText ? emptyText : status;
}

// 로드 상태 앞(lead)·뒤(tail)에 화면에만 보이던 실패 줄을 그 줄과 단추의 말로 붙인다: 상태가 비었으면(불러오는 중) 그대로 둔다.
/**
 * @param {string} status loadStatusText 등의 로드 상태
 * @param {{ lead?: any[], tail?: any[] }} lines 실패한 줄마다 [줄의 말, 단추 이름], 실패하지 않았으면 거짓 값(건너뛴다)
 * @returns {string}
 */
export function withFailedLines(status, { lead = [], tail = [] } = {}) {
	if (!status) return status;
	/** @param {any[]} items */
	const sentences = (items) =>
		items.filter(Boolean).map(([text, button]) => `${text} ${button}로 다시 부를 수 있습니다.`);
	return [...sentences(lead), status, ...sentences(tail)].join(' ');
}
