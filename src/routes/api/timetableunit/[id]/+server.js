import { json } from '@sveltejs/kit';
import { backendServer } from '$lib/globals';

export	async function GET({ params }) {
	const { id } = params;
	const response = await fetch(`${backendServer}/time_manage/timetableunit/${id}`);

	if (response.ok) {
		const data = await response.json();
		return json(data);
	}
	return json({ message: 'APIError fetching timetableunit info' }, 400);
}

export async function PUT({ params, request }) {
	const { id } = params;
	const body = await request.json();
	const response = await fetch(`${backendServer}/time_manage/timetableunit/${id}/`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});

	if (response.ok) {
		const data = await response.json();
		return json(data);
	}
	return json({ message: 'APIError updating timetableunit info' }, 400);
}

export async function DELETE({ params }) {
	const { id } = params;
	const response = await fetch(`${backendServer}/time_manage/timetableunit/${id}/`, {
		method: 'DELETE'
	});

	if (response.ok) {
		return json({ message: 'Timetableunit successfully deleted' });
	}
	return json({ message: 'APIError deleting timetableunit info' }, 400);
}
