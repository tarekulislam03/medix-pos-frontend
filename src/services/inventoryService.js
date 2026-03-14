import api from './api';

/**
 * Get all products (with optional filters)
 * @param {Object} params - { page, limit, filter, search }
 * filter: 'all' | 'low_stock' | 'expiring_soon'
 */
export const getProducts = async (params = {}) => {
    try {
        const response = await api.get('/product/get', { params });
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Get a single product by ID
 * @param {string} productId
 */
export const getProductById = async (productId) => {
    try {
        const response = await api.get(`/product/get/${productId}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Create a new product
 * @param {Object} productData
 */
export const createProduct = async (productData) => {
    try {
        const response = await api.post('/product/create', productData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Update a product
 * @param {string} productId
 * @param {Object} productData
 */
export const updateProduct = async (productId, productData) => {
    try {
        const response = await api.put(`/product/update/${productId}`, productData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Delete a product
 * @param {string} productId
 */
export const deleteProduct = async (productId) => {
    try {
        const response = await api.delete(`/product/delete/${productId}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};



/**
 * Generate thermal labels (PDF) for selected products with copy counts
 * @param {{ productId: string, copies: number }[]} items
 * @returns {Promise<Blob>}
 */
export const generateLabels = async (items) => {
    try {
        const response = await api.post('barcode/labels/generate', { items }, {
            responseType: 'blob',
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Auto-import bill: upload an image and get extracted medicines back
 * @param {File|Blob} imageFile
 * @returns {Promise<Object>} - { products: Array<{medicine_name, quantity, mrp, cost_price, supplier_name, expiry_date}> }
 */
export const autoImportBill = async (file) => {
    try {
        const formData = new FormData();
        formData.append('bill', file);
        const response = await api.post('/product/auto-import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000, // AI processing can be slow
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Confirm auto-import: send reviewed/edited items for final persistence
 * @param {Array<{medicine_name: string, quantity: number, mrp: number, cost_price?: number, supplier_name?: string, expiry_date: string}>} items
 * @returns {Promise<Object>}
 */
export const confirmAutoImport = async (items) => {
    try {
        const response = await api.post('/product/auto-import/confirm', { items });
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Get loose tablet price for a product
 * GET /api/v1/products/loose-price/:productId?quantity=N
 * @param {string} productId
 * @param {number} [quantity]  - optional number of tablets; omit for just price_per_tablet
 * @returns {Promise<{ success, medicine_name, mrp_per_strip, tablets_per_strip, price_per_tablet, requested_tablets, total_price }>}
 */
export const getLoosePrice = async (productId, quantity) => {
    try {
        const params = quantity !== undefined ? { quantity } : {};
        const response = await api.get(`/product/loose-price/${productId}`, { params });
        return response.data;
    } catch (error) {
        throw error;
    }
};
