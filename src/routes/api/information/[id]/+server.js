import { json } from '@sveltejs/kit';
import { backendServer } from '$lib/globals';

export async function PUT({ params, request }) {
	const { id } = params;
	const body = await request.json();
	const response = await fetch(`${backendServer}/time_manage/information/${id}/`, {
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
	return json({ message: 'Error updating user info' }, 400);
}

export async function DELETE({ params }) {
	const { id } = params;
	const response = await fetch(`${backendServer}/time_manage/information/${id}/`, {
		method: 'DELETE'
	});

	if (response.ok) {
		return json({ message: 'Information (News) successfully deleted' });
	}
	return json({ message: 'Error deleting Information (News)' }, 400);
}
