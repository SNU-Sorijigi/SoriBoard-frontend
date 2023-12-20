import { json } from '@sveltejs/kit';

export async function PUT({ params, request }) {
    const body = await request.json();
    const id = params.id;

    const response = await fetch(`http://127.0.0.1:8000/time_manage/semesterpost/${id}/`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    if (response.ok) {
        const data = await response.json();
        return json(data, { status: 200 });
    } else {
        const errorData = await response.json();
        return json(errorData, { status: response.status });
    }
}