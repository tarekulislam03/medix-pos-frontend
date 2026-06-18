import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import InventoryScreen from '../screens/InventoryScreen';
import MockAdapter from 'axios-mock-adapter';
import api from '../services/api';

import { Platform } from 'react-native';

// Polyfill for File class which may be missing in Jest environment
if (typeof File === 'undefined') {
    global.File = class File {
        constructor(chunks, name, options) {
            this.name = name;
            this.type = options ? options.type : '';
        }
    };
}

describe('Purchase / AI Import flow', () => {
    let mock;
    const mockNav = { navigate: jest.fn(), setOptions: jest.fn() };
    const mockRoute = { params: {} };

    beforeAll(() => {
        // Force Platform to report as web for these tests
        Object.defineProperty(Platform, 'OS', { get: () => 'web' });
        global.document = {
            createElement: jest.fn((tag) => {
                if (tag === 'input') {
                    return {
                        type: '',
                        accept: '',
                        onchange: null,
                        click: function() {
                            if (this.onchange) {
                                // Simulate user picking an image
                                const fakeFile = new File(['dummy'], 'invoice.jpg', { type: 'image/jpeg' });
                                this.onchange({ target: { files: [fakeFile] } });
                            }
                        }
                    };
                }
                return {
                    style: {},
                    appendChild: jest.fn(),
                    removeChild: jest.fn(),
                };
            }),
            body: {
                appendChild: jest.fn(),
                removeChild: jest.fn(),
                contains: jest.fn().mockReturnValue(true),
            }
        };
        global.URL = {
            createObjectURL: jest.fn(),
            revokeObjectURL: jest.fn(),
        };
    });

    beforeEach(() => {
        mock = new MockAdapter(api);
        // Default products list returns empty
        mock.onGet('/product/get').reply(200, { data: [] });
    });

    afterEach(() => {
        mock.restore();
        jest.clearAllMocks();
    });

    it('1. Mocks a successful AI import (POST /product/auto-import) and renders Review Modal', async () => {
        mock.onPost('/product/auto-import').reply(200, {
            bill_no: 'INV-100',
            bill_date: '2026-06-18',
            products: [{
                medicine_name: 'Test Medicine',
                quantity: '10',
                mrp: '50',
                cost_price: '40',
                supplier_name: 'Supplier A'
            }]
        });

        const { getByText, findByText, getByDisplayValue } = render(
            <InventoryScreen navigation={mockNav} route={mockRoute} />
        );

        // Click "Upload bill"
        fireEvent.press(await findByText('Upload bill'));

        // Wait for modal to pop up
        expect(await findByText('Review Extracted Medicines')).toBeTruthy();
        expect(getByText('Invoice: INV-100')).toBeTruthy();
        
        // Assert data populates correctly
        expect(getByDisplayValue('Test Medicine')).toBeTruthy();
        expect(getByDisplayValue('10')).toBeTruthy();
        expect(getByDisplayValue('50')).toBeTruthy();
    });

    it('2. Handles a blurry/invalid import response (API returns error or malformed data)', async () => {
        // Return malformed data (empty array instead of medicine objects)
        mock.onPost('/product/auto-import').reply(200, {
            bill_no: 'INV-ERR',
            products: []
        });

        const { findByText } = render(
            <InventoryScreen navigation={mockNav} route={mockRoute} />
        );

        fireEvent.press(await findByText('Upload bill'));

        // Wait for error modal banner text
        const errorText = await findByText(/No medicines could be extracted/i);
        expect(errorText).toBeTruthy();
    });

    it('3. Handles duplicate medicine detection (if frontend handles it via 400 error response)', async () => {
        mock.onPost('/product/auto-import').reply(200, {
            bill_no: 'INV-DUP',
            products: [{
                medicine_name: 'Duplicate Med',
                quantity: '10',
                mrp: '50'
            }]
        });

        // Backend throws 400 when creating a duplicate
        mock.onPost('/product/create').reply(400, {
            message: 'Product already exists'
        });

        const { getByText, findByText } = render(
            <InventoryScreen navigation={mockNav} route={mockRoute} />
        );

        fireEvent.press(await findByText('Upload bill'));

        // Wait for modal to pop up
        expect(await findByText('Review Extracted Medicines')).toBeTruthy();

        // Click Confirm
        fireEvent.press(getByText('Confirm & Import'));

        // Wait for error handling
        const errorBanner = await findByText(/Product already exists/i);
        expect(errorBanner).toBeTruthy();
    });

    it('4 & 5. Simulates user editing the imported data before confirming and Mocks POST confirm endpoints', async () => {
        // Step 1: Initial AI import
        mock.onPost('/product/auto-import').reply(200, {
            bill_no: 'INV-EDIT',
            purchase_id: 'PURCHASE_123',
            products: [{
                medicine_name: 'Old Medicine Name',
                quantity: '10',
                mrp: '50'
            }]
        });

        // Requirement 5: Mock confirming import updates inventory payload
        mock.onPost('/product/auto-import/confirm').reply(200, { success: true });
        mock.onPost('/product/create').reply(200, { data: { _id: 'inventory_1' } });
        mock.onPatch('/purchase/PURCHASE_123/finalize').reply(200, { success: true });

        const { getByText, findByText, getByDisplayValue } = render(
            <InventoryScreen navigation={mockNav} route={mockRoute} />
        );

        fireEvent.press(await findByText('Upload bill'));

        // Wait for modal
        expect(await findByText('Review Extracted Medicines')).toBeTruthy();

        // 4. Simulate user editing imported data
        const nameInput = getByDisplayValue('Old Medicine Name');
        fireEvent.changeText(nameInput, 'New Edited Medicine Name');

        const qtyInput = getByDisplayValue('10');
        fireEvent.changeText(qtyInput, '20');

        // Verify edited value is in place
        expect(getByDisplayValue('New Edited Medicine Name')).toBeTruthy();
        expect(getByDisplayValue('20')).toBeTruthy();

        // 5. Click Confirm
        fireEvent.press(getByText('Confirm & Import'));

        // Check if successful toast shows
        const toastMessage = await findByText(/1 product added to inventory/i);
        expect(toastMessage).toBeTruthy();
    });
});
