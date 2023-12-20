import { json } from '@sveltejs/kit';

export async function GET({ }) {
    const response = await fetch(`http://127.0.0.1:8000/time_manage/time`);
    if (response.ok) {
        const data = await response.json();
        return json(data);
    }
    return json({ message: 'Error' }, 400);
}