import api from './api';

/**
 * Fetch expiry savings metrics — monthly breakdown of
 * estimated loss saved from near-expiry medicines.
 */
export const getExpirySavings = async () => {
    try {
        const res = await api.get('/savings/expiry');
        return res.data;
    } catch (error) {
        console.error('Failed to fetch expiry savings:', error);
        return null;
    }
};
