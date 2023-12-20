import { json } from '@sveltejs/kit';

export async function POST({ request }) {
    const body = await request.json();
    const response = await fetch(`http://127.0.0.1:8000/time_manage/semesteruserpost/`, {
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