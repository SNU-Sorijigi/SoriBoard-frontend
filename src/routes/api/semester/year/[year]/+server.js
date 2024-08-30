import { json } from '@sveltejs/kit';
import { backendServer } from '$lib/globals';

export async function GET({ params }) {
	const { year } = params;
	const response = await fetch(
		`${backendServer}/time_manage/checksemester/${year}`
	);
	if (response.ok) {
		const data = await response.json();
		return json(data);
	}
	return json({ message: 'Error' }, 400);
}


