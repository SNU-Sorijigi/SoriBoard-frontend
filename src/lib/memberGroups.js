// 지기 목록을 현역과 OB 로 나눈다(통계의 지기 선택에서 현역을 먼저 찾게).
// 각 묶음은 받은 순서(백엔드: 최근 입부 순)를 지키고, 빈 묶음은 뺀다.
// is_ob 가 없거나 거짓이면 현역으로 센다. 배열이 아니면 [].
export function memberGroups(users) {
	if (!Array.isArray(users)) return [];
	const groups = [
		{ label: '현역', users: users.filter((user) => !user?.is_ob) },
		{ label: 'OB', users: users.filter((user) => Boolean(user?.is_ob)) }
	];
	return groups.filter((group) => group.users.length > 0);
}
