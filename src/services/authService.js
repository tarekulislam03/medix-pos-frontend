import api from './api';

/**
 * Register a new user/store
 * @param {Object} data - { storeName, phone, password }
 */
export const registerUser = async (data) => {
    try {
        const response = await api.post('/user/register', data);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Login user
 * @param {Object} credentials - { phone, password }
 */
export const loginUser = async (credentials) => {
    try {
        const response = await api.post('/user/login', credentials);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Logout user
 */
export const logoutUser = async () => {
    try {
        const response = await api.post('/user/logout');
        return response.data;
    } catch (error) {
        throw error;
    }
};
