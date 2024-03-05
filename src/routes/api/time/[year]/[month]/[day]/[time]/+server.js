import { json } from '@sveltejs/kit';
import { backendServer } from '$lib/globals';

export async function GET({ params }) {
    const {year, month, day, time} = params;
    const formattedMonth = month.toString().padStart(2, '0');
    const formattedDay = day.toString().padStart(2, '0');
    const dateStr = `date=${year}-${formattedMonth}-${formattedDay}`;
    const timeStr = `time=${time}`;
    const response = await fetch(`${backendServer}/time_manage/timeinfo/?${dateStr}&${timeStr}`);
    if (response.ok) {
        const data = await response.json();
        return json(data);
    }
    return json({ message: 'Error' }, 400);
}