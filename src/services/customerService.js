import api from './api';

export const getCustomers = async (params = {}) => {
    try {
        const response = await api.get('/customer/get', { params });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getCustomerById = async (id) => {
    try {
        const response = await api.get(`/customer/get/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const createCustomer = async (data) => {
    try {
        const response = await api.post('/customer/create', data);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const updateCustomer = async (id, data) => {
    try {
        const response = await api.put(`/customer/update/${id}`, data);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const deleteCustomer = async (id) => {
    try {
        const response = await api.delete(`/customer/delete/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const searchCustomer = async (query) => {
    try {
        const response = await api.get('/customer/search', { params: { q: query } });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getCustomerLastPurchase = async (id) => {
    try {
        const response = await api.get(`/customer/lastpurchase/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Get credit (due) balance for a customer
 * @param {string} id - Customer ID
 */
export const getCustomerCredit = async (id) => {
    try {
        const response = await api.get(`/customer/credit/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Record a due payment for a customer (paying off outstanding credit)
 * @param {string} id - Customer ID
 * @param {Object} data - { amount_paid, payment_method }
 */
export const payCustomerDue = async (id, data) => {
    try {
        const response = await api.post(`/customer/pay-due/${id}`, data);
        return response.data;
    } catch (error) {
        throw error;
    }
};

