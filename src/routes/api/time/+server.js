import { json } from '@sveltejs/kit';
import { backendServer } from '$lib/globals';

export async function POST({ request }) {
	const body = await request.json();
	const response = await fetch(`${backendServer}/time_manage/timeinfo/`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});
	if (response.ok) {
		const data = await response.json();
		return json(data);
	}
}
