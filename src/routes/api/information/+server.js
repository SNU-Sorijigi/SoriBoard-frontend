import { json } from '@sveltejs/kit';
import { backendServer } from '$lib/globals';

export async function GET() {
	const response = await fetch(`${backendServer}/time_manage/information/`);
	if (response.ok) {
		const data = await response.json();
		return json(data);
	}
	return json({ message: 'Error' }, { status: 400 });
}

export async function POST({ request }) {
	const body = await request.json();
	const response = await fetch(`${backendServer}/time_manage/information/`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});
	if (!response.ok) {
		return new Response(JSON.stringify({ error: 'Failed to create News' }), {
			status: 400
		});
	}
	if (response.ok) {
		const data = await response.json();
		return json(data);
	}
}
