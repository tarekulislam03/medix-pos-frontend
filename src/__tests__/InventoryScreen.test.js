import React from 'react';
import { render, fireEvent, waitFor, within } from '@testing-library/react-native';
import { Alert } from 'react-native';
import InventoryScreen from '../screens/InventoryScreen';
import * as inventoryService from '../services/inventoryService';
import { useFocusEffect } from '@react-navigation/native';

jest.mock('../services/inventoryService', () => ({
    getProducts: jest.fn(),
    createProduct: jest.fn(),
    updateProduct: jest.fn(),
    deleteProduct: jest.fn(),
    autoImportBill: jest.fn(),
    confirmAutoImport: jest.fn(),
}));

jest.mock('../services/purchaseService', () => ({
    finalizePurchase: jest.fn(),
    getPurchases: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
    useFocusEffect: jest.fn((cb) => cb()),
}));

jest.mock('../utils/responsive', () => ({
    useResponsive: () => ({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
    }),
}));

const MOCK_PRODUCTS = [
    {
        _id: '1',
        medicine_name: 'Paracetamol',
        mrp: 50,
        cost_price: 30,
        quantity: 100,
        batch_number: 'B001',
        alert_threshold: 10,
        supplier_name: 'PharmaInc',
        expiry_date: '2025-12-31',
    },
    {
        _id: '2',
        medicine_name: 'Paracetamol',
        mrp: 50,
        cost_price: 30,
        quantity: 50,
        batch_number: 'B002',
        alert_threshold: 10,
        supplier_name: 'PharmaInc',
        expiry_date: '2026-06-30',
    },
    {
        _id: '3',
        medicine_name: 'Ibuprofen',
        mrp: 60,
        cost_price: 40,
        quantity: 5,
        batch_number: 'B003',
        alert_threshold: 10,
        supplier_name: 'HealthCorp',
        expiry_date: '2024-01-01',
    },
];

describe('InventoryScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        inventoryService.getProducts.mockResolvedValue(MOCK_PRODUCTS);
        inventoryService.createProduct.mockResolvedValue({ data: { success: true } });
        
        // Mock React Navigation's useFocusEffect to execute immediately
        useFocusEffect.mockImplementation((callback) => {
            callback();
        });
        
        jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    });

    const setup = (routeParams = {}) => {
        const route = { params: routeParams };
        return render(<InventoryScreen navigation={{}} route={route} />);
    };

    it('1. Render product list correctly', async () => {
        const { getByText, findAllByText } = setup();

        // Check if API was called
        expect(inventoryService.getProducts).toHaveBeenCalledTimes(1);

        // Check if Paracetamol is rendered (might be multiple times due to multiple batches)
        const paracetamolItems = await findAllByText('Paracetamol');
        expect(paracetamolItems.length).toBeGreaterThanOrEqual(2);

        // Check if Ibuprofen is rendered
        await waitFor(() => {
            expect(getByText('Ibuprofen')).toBeTruthy();
        });
    });

    it('2. Search and filter logic works locally on the frontend state', async () => {
        const { getByPlaceholderText, getByText, queryByText, findAllByText } = setup();
        
        await findAllByText('Paracetamol');

        // Search for Ibuprofen
        const searchInput = getByPlaceholderText('Search...');
        fireEvent.changeText(searchInput, 'Ibu');

        await waitFor(() => {
            expect(getByText('Ibuprofen')).toBeTruthy();
            expect(queryByText('Paracetamol')).toBeNull();
        });

        // Clear search
        fireEvent.changeText(searchInput, '');
        await findAllByText('Paracetamol');

        // Filter: Low stock
        const lowStockTab = getByText('Low stock');
        fireEvent.press(lowStockTab);

        // Ibuprofen has 5 quantity and threshold 10, so it's low stock
        // Paracetamol has 100 and 50, both > threshold 10, so not low stock
        await waitFor(() => {
            expect(getByText('Ibuprofen')).toBeTruthy();
            expect(queryByText('Paracetamol')).toBeNull();
        });
    });

    it('3. & 4. Batch quantity calculations are correctly displayed and handles multiple batches', async () => {
        const { findAllByText } = setup();
        
        // Ensure both batches of Paracetamol are shown with their respective quantities
        // Wait for data to load
        await findAllByText('Paracetamol');

        // Product list should show the batch numbers if it renders them in mobile card
        // Actually, since we mocked isMobile: true, we should check if quantity 100 and 50 are rendered
        // In Mobile Card it displays: <Text style={styles.mobileStatValue}>{item.quantity}</Text>
        const qty100 = await findAllByText('100');
        const qty50 = await findAllByText('50');
        const qty5 = await findAllByText('5');

        expect(qty100).toBeTruthy();
        expect(qty50).toBeTruthy();
        expect(qty5).toBeTruthy();
    });

    it('5. Trigger adding a product and check payload structure', async () => {
        const { getByText, getByPlaceholderText, getAllByPlaceholderText } = setup();

        await waitFor(() => expect(inventoryService.getProducts).toHaveBeenCalled());

        const addBtn = getByText('Add Product');
        fireEvent.press(addBtn);

        const nameInput = getByPlaceholderText('e.g. Paracetamol 500mg');
        const mrpInputs = getAllByPlaceholderText('0.00'); // mrp, cost_price
        const qtyInputs = getAllByPlaceholderText('0'); // quantity, alert_threshold
        const batchInput = getByPlaceholderText('e.g. B12345');

        fireEvent.changeText(nameInput, 'Aspirin');
        fireEvent.changeText(mrpInputs[0], '10.50'); // mrp
        fireEvent.changeText(qtyInputs[0], '20'); // quantity
        fireEvent.changeText(batchInput, 'BATCH99');

        const saveBtn = getByText('Save Product');
        fireEvent.press(saveBtn);

        await waitFor(() => {
            expect(inventoryService.createProduct).toHaveBeenCalledWith(expect.objectContaining({
                medicine_name: 'Aspirin',
                mrp: 10.5,
                quantity: 20,
                batch_number: 'BATCH99',
            }));
        });
    });
});
