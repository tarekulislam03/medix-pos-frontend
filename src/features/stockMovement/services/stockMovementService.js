import api from '../../../core/services/api';

export const getStockMovements = async (params = {}) => {
    try {
        const response = await api.get('/stock-movement', { params });
        return response.data;
    } catch (error) {
        throw error;
    }
};
