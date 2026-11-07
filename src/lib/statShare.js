// 개인 통계의 KPI 칸 아래 줄: 그 지기의 수가 같은 기간 클럽 전체에서 차지하는 몫.
// '클럽 342곡 중 12.3%'. 비율은 통계의 표처럼 소수 한 자리(formatShare)다.
import { formatShare } from './statTable.js';

// mine·club 이 없거나(불러오는 중·실패·예전 백엔드) club 이 0 이면 '' 이고 줄을 쓰지 않는다.
// mine 이 0 이어도 쓴다(그 기간에 신청곡을 하나도 틀지 않았다는 것도 알릴 만하다).
/**
 * @param {number | null | undefined} mine
 * @param {number | null | undefined} club
 * @param {string} unit '곡' | '타임'
 */
export function clubShareText(mine, club, unit) {
	if (mine == null || club == null || club === 0) return '';
	return `클럽 ${club.toLocaleString()}${unit} 중 ${formatShare((mine / club) * 100)}`;
}
