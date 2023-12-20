import { json } from '@sveltejs/kit';

export async function GET({ params }) {
    const { year, semester } = params;
    const response = await fetch(`http://127.0.0.1:8000/time_manage/semester/?year=${year}&semester=${semester}`);
    if (response.ok) {
        const data = await response.json();
        return json(data);
    }
    return json({ message: 'Error' }, 400);
}