import api from './api';
import axios from 'axios';

let adminToken = null;

export const setAdminToken = (token) => { adminToken = token; };
export const getAdminToken = () => adminToken;
export const clearAdminToken = () => { adminToken = null; };

// Create a separate axios instance for admin calls (different auth token)
const adminApi = () => {
    const baseURL = process.env.EXPO_PUBLIC_BASE_URL || api.defaults.baseURL;
    return axios.create({
        baseURL,
        timeout: 45000,
        headers: {
            'Content-Type': 'application/json',
            ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
    });
};

export const adminLogin = async (username, password) => {
    try {
        const response = await adminApi().post('/master-medicines/login', { username, password });
        if (response.data?.token) {
            setAdminToken(response.data.token);
        }
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getMasterMedicines = async (page = 1, limit = 20, search = '') => {
    try {
        const response = await adminApi().get('/master-medicines', { params: { page, limit, search } });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const addMasterMedicine = async (data) => {
    try {
        const response = await adminApi().post('/master-medicines', data);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const updateMasterMedicine = async (id, data) => {
    try {
        const response = await adminApi().put(`/master-medicines/${id}`, data);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const deleteMasterMedicine = async (id) => {
    try {
        const response = await adminApi().delete(`/master-medicines/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const importMasterMedicines = async (file) => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const instance = adminApi();
        // Override content type for multipart
        instance.defaults.headers['Content-Type'] = 'multipart/form-data';
        
        const response = await instance.post('/master-medicines/import', formData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const searchMasterMedicines = async (query) => {
    try {
        const response = await api.get('/master-medicines/search', { params: { query } });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const bulkAddFromMaster = async (items) => {
    try {
        const response = await api.post('/product/bulk-from-master', { items });
        return response.data;
    } catch (error) {
        throw error;
    }
};
