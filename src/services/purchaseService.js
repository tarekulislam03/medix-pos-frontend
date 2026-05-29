import api from './api';

/**
 * Upload a purchase bill image manually (from the Purchase page).
 * @param {FormData} formData - must include a field named "bill" (the image file)
 */
export const uploadPurchaseBill = async (formData) => {
    const response = await api.post('/purchase/upload-bill', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
    });
    return response.data;
};

/**
 * Get all purchase records for the store.
 */
export const getPurchases = async () => {
    const response = await api.get('/purchase/');
    return response.data;
};

/**
 * Delete a purchase record by ID.
 */
export const deletePurchase = async (id) => {
    const response = await api.delete(`/purchase/${id}`);
    return response.data;
};

/**
 * Finalize a pending auto-import purchase record after the user confirms.
 * Marks it as 'received' and fills in supplier / total / items_count metadata.
 *
 * @param {string} purchaseId   - the _id returned by /product/auto-import
 * @param {Object} meta         - { supplier_name, total_amount, items_count }
 */
export const finalizePurchase = async (purchaseId, meta) => {
    const response = await api.patch(`/purchase/${purchaseId}/finalize`, meta);
    return response.data;
};
