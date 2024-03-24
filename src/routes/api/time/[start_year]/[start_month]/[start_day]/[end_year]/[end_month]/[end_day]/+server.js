import { json } from '@sveltejs/kit';
import { backendServer } from '$lib/globals';

export async function GET({ params }) {
	const { start_year, start_month, start_day, end_year, end_month, end_day } = params;
	const response = await fetch(
		`${backendServer}/time_manage/checktime/${start_year}/${start_month}/${start_day}/${end_year}/${end_month}/${end_day}`
	);
	if (response.ok) {
		const data = await response.json();
		return json(data);
	}
	return json({ message: 'Error' }, 400);
}
