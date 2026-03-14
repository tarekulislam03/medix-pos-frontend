import api from './api';

/**
 * Search products by name (partial match) or barcode (exact match)
 * @param {Object} params - { query: string, type: 'name' | 'barcode' }
 */
export const searchProducts = async ({ query, type = 'name' }) => {
    try {
        const params =
            type === 'barcode'
                ? { barcode: query }
                : { product_name: query };

        const response = await api.get('/product/search?keyword=' + query);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Process checkout
 * @param {Object} payload - { items: [...], payment_method: 'cash' | 'upi' | 'card' }
 */
export const processCheckout = async (payload) => {
    try {
        const response = await api.post('/billing/checkout', payload);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Get invoice by ID
 * @param {string} invoiceId
 */
export const getInvoice = async (invoiceId) => {
    try {
        const response = await api.get(`/billing/invoice/${invoiceId}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Get list of invoices
 * @param {Object} params - { page, limit, date_from, date_to }
 */
export const getInvoices = async (params = {}) => {
    try {
        const response = await api.get('/billing/invoices', { params });
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Get dashboard stats (dummy endpoint — adjust to your backend)
 */
export const getDashboardStats = async () => {
    try {
        const response = await api.get('/dashboard/stats');
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Login
 * @param {Object} credentials - { email, password }
 */
export const loginUser = async (credentials) => {
    try {
        const response = await api.post('/auth/login', credentials);
        return response.data;
    } catch (error) {
        throw error;
    }
};
