import { json } from '@sveltejs/kit';

export async function GET({ }) {
    const response = await fetch(`http://127.0.0.1:8000/time_manage/users/`);
    if (response.ok) {
        const data = await response.json();
        return json(data);
    }
    return json({ message: 'Error' }, 400);
}

export async function POST({ request }) {
    const body = await request.json();
    const response = await fetch(`http://127.0.0.1:8000/time_manage/users/`, {
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
    return json({ message: 'Error' }, 400);
}