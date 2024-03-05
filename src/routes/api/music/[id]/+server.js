import { json } from '@sveltejs/kit';
import { backendServer } from '$lib/globals';

export async function PUT({ params, request }) {
    const {id} = params;
    const body = await request.json();
    const response = await fetch(`${backendServer}/time_manage/timemusic/${id}/`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        return new Response(JSON.stringify({ error: 'Failed to edit TimeMusic' }), {
            status: 400,
        });
    }
    if (response.ok) {
        const data = await response.json();
        return json(data);
    }
}

export async function DELETE({ params }) {
    const { id } = params;
    const response = await fetch(`${backendServer}/time_manage/timemusic/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        return new Response(JSON.stringify({ error: 'Failed to delete TimeMusic' }), {
            status: 400,
        });
    }
    if (response.ok) {
        const data = await response.json();
        return json(data);
    }
}