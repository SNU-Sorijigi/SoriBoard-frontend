export async function load({ fetch }) {
    try {
        const response = await fetch(`/api/user`);
        if (response.ok) {
            const users = await response.json();
            return {users};
        } else {
            throw new Error('Failed to fetch users');
        }
    } catch (error) {
        return { props: { error: error.message } };
    }
}