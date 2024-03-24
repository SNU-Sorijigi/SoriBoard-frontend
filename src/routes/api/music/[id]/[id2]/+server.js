import { json } from '@sveltejs/kit';
import { backendServer } from '$lib/globals';

export async function POST({ params }) {
	const { id, id2 } = params;
	const response = await fetch(`${backendServer}/time_manage/swaporder/${id}/${id2}/`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		}
	});
	if (!response.ok) {
		return new Response(JSON.stringify({ error: 'Failed to swap TimeMusic' }), {
			status: 400
		});
	}
	if (response.ok) {
		const data = await response.json();
		return json(data);
	}
}
