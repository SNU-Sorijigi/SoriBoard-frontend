// 백엔드는 선곡이 있는 주·월·학기만 보내 차트가 빈 칸을 붙여 그린다: 학기 결산의 부제처럼 빠진 수를 알린다.

const WEEK = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH = /^(\d{4})-(\d{2})$/;
const SEMESTER = /^(\d{4})-([12])$/;
const DAY = 24 * 60 * 60 * 1000;

// 라벨 하나를 그 단위의 연속된 번호로: 주 = 1970-01-01부터의 날 수, 월 = 연·월, 학기 = 연·학기. 형식이 틀리면 null.
/**
 * @param {string} bucket
 * @param {string} label
 * @returns {number | null}
 */
function ordinal(bucket, label) {
	if (bucket === 'week') {
		const m = WEEK.exec(label);
		if (!m) return null;
		const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
		const time = Date.UTC(y, mo - 1, d);
		const date = new Date(time);
		// 2026-02-30 같은 없는 날은 틀린 라벨이다.
		if (date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
		return time / DAY;
	}
	if (bucket === 'month') {
		const m = MONTH.exec(label);
		if (!m) return null;
		const month = Number(m[2]);
		return month >= 1 && month <= 12 ? Number(m[1]) * 12 + month : null;
	}
	if (bucket === 'semester') {
		const m = SEMESTER.exec(label);
		return m ? Number(m[1]) * 2 + Number(m[2]) : null;
	}
	return null;
}

// 첫 라벨과 마지막 라벨 사이에서 빠진 주·월·학기 수. 라벨은 정렬되지 않아도 되고 같은 라벨은 한 번 센다.
// 라벨이 둘보다 적거나, 모르는 단위이거나, 형식이 틀린 라벨이 있으면 0.
/**
 * @param {string} bucket 'week' | 'month' | 'semester'
 * @param {string[]} labels stats/timeline·diversity 의 원래 라벨('2026-03-02', '2026-03', '2026-1')
 */
export function missingBuckets(bucket, labels) {
	if (!Array.isArray(labels) || labels.length < 2) return 0;
	const values = new Set();
	for (const label of labels) {
		const value = ordinal(bucket, label);
		if (value === null) return 0;
		values.add(value);
	}
	const first = Math.min(...values);
	const last = Math.max(...values);
	let span = last - first + 1;
	if (bucket === 'week') {
		// 주 라벨은 모두 월요일이라 7일 간격이다. 아니면 셀 수 없다.
		if ([...values].some((v) => (v - first) % 7 !== 0)) return 0;
		span = (last - first) / 7 + 1;
	}
	return Math.max(0, span - values.size);
}

const UNITS = { week: '주는', month: '개월은', semester: '개 학기는' };

// 차트 카드 아래 한 줄: '선곡이 없는 3주는 빠져 있습니다'. 빠진 것이 없으면 ''.
/**
 * @param {string} bucket 'week' | 'month' | 'semester'
 * @param {string[]} labels
 */
export function gapNote(bucket, labels) {
	const n = missingBuckets(bucket, labels);
	if (!n) return '';
	const unit = UNITS[/** @type {keyof typeof UNITS} */ (bucket)];
	return `선곡이 없는 ${n}${unit} 빠져 있습니다`;
}
