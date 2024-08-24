import { json } from '@sveltejs/kit';
import { backendServer } from '$lib/globals';

export async function GET({ params }) {
	const { id } = params;
	const response = await fetch(`${backendServer}/time_manage/semester/`);
	if (response.ok) {
		const data = await response.json();
		return json(data);
	}
	return json({ message: 'Error' }, 400);
}

export async function POST({ request }) {
	const body = await request.json();
	const response = await fetch(`${backendServer}/time_manage/semester/`, {
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
