import api from './api';

/**
 * Fetch GST summary for a given month and year.
 * @param {number} year - The year (e.g., 2026)
 * @param {number} month - The month (1 to 12)
 * @returns {Promise<Object>} Contains summary, purchases (input tax), and sales (output tax)
 */
export const getGstSummary = async (year, month) => {
    const response = await api.get(`/gst/summary`, {
        params: { year, month }
    });
    return response.data;
};
