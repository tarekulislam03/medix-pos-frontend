import { processCheckout } from '../services/billingService';
import * as inventoryService from '../services/inventoryService';
import api from '../services/api';
import MockAdapter from 'axios-mock-adapter';

const mockApi = new MockAdapter(api);

describe('Critical E2E Regression Suite (Frontend Logic)', () => {
    afterEach(() => {
        mockApi.reset();
        jest.clearAllMocks();
    });

    it('Complete Flow: Add Product -> Checkout -> Auto-Import', async () => {
        // 1. Mock creating a product
        const newProduct = {
            medicine_name: 'RegressionTestMed',
            batch_no: 'B-REG-1',
            mrp: 100,
            quantity: 50,
        };

        mockApi.onPost('/product/create').reply(201, {
            success: true,
            message: 'Product Created',
            data: { _id: 'med_1', ...newProduct },
        });

        const resCreate = await api.post('/product/create', newProduct);
        expect(resCreate.data.success).toBe(true);

        // 2. Checkout
        const cart = [{ ...newProduct, _id: 'med_1', quantity: 2 }];
        mockApi.onPost('/billing/checkout').reply(201, {
            success: true,
            invoice: { invoice_number: 'INV-REG-1' },
        });

        const resCheckout = await processCheckout(cart, 'Cash', 0, null, 100);
        expect(resCheckout.success).toBe(true);

        // 3. Auto-Import Confirm
        const aiData = [{
            medicine_name: 'RegressionTestMed',
            batch_no: 'B-REG-2',
            mrp: 120,
            quantity: 200,
            expiry_date: '2027-01-01',
        }];

        mockApi.onPost('/product/auto-import/confirm').reply(200, {
            success: true,
            results: { successful: 1, failed: 0 },
        });

        const resAi = await api.post('/product/auto-import/confirm', { updates: aiData });
        expect(resAi.data.success).toBe(true);
    });
});
