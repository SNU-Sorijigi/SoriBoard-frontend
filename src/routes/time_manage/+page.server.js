import { time_table } from "$lib/server/database";

export function load() {
    return {
        time_table
    };
}

export const actions = {
    default: async ({ request }) => {
        const data = await request.formData();
        const converted = {};
        for (const entry of data.entries()) {
            const [key, value] = entry;
            converted[key] = value;
        }
        console.log(converted);
        time_table.push(converted);
    }
}