import api from './api';

export const getStockMovements = async (params = {}) => {
    try {
        const response = await api.get('/stock-movement', { params });
        return response.data;
    } catch (error) {
        throw error;
    }
};
