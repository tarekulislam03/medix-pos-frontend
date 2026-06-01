import api from './api';

/**
 * Fetch all expenses
 */
export const getExpenses = async () => {
    try {
        const response = await api.get('/expenses');
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Add a new expense
 * @param {Object} expenseData 
 */
export const addExpense = async (expenseData) => {
    try {
        const response = await api.post('/expenses', expenseData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Update an existing expense
 * @param {string} id 
 * @param {Object} expenseData 
 */
export const updateExpense = async (id, expenseData) => {
    try {
        const response = await api.put(`/expenses/${id}`, expenseData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Delete an expense
 * @param {string} id 
 */
export const deleteExpense = async (id) => {
    try {
        const response = await api.delete(`/expenses/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};
