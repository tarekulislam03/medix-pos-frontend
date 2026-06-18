import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import BillingScreen from '../screens/BillingScreen';
import api from '../services/api';
import MockAdapter from 'axios-mock-adapter';
import { Alert } from 'react-native';

const mockApi = new MockAdapter(api);


jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest.fn().mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
  };
});

jest.mock('../utils/responsive', () => ({
    useResponsive: () => ({
        isSmall: true,
        isMedium: false,
        isLarge: false,
        isXLarge: false,
        pick: (obj) => obj.small || obj.medium || obj.large || obj.xlarge || Object.values(obj)[0]
    }),
}));


describe('BillingScreen Workflows', () => {
    beforeEach(() => {
        mockApi.reset();
        if (Alert.alert.mock) Alert.alert.mockClear();
        jest.spyOn(Alert, 'alert');
    });

    const mockProducts = [
        {
            _id: 'p1',
            medicine_name: 'Paracetamol',
            quantity: 10,
            mrp: 50,
            batch_number: 'B1',
            expiry_date: '2025-12-01',
        },
        {
            _id: 'p2',
            medicine_name: 'Paracetamol',
            quantity: 5,
            mrp: 50,
            batch_number: 'B2',
            expiry_date: '2026-12-01',
        }
    ];

    it('adds product to cart and checks out correctly (handles duplicate prevention and verifies payload)', async () => {
        mockApi.onGet('/product/get').reply(200, { data: mockProducts });
        mockApi.onGet('/sales/history').reply(200, { data: [] });
        mockApi.onGet('/product/lowstock').reply(200, { data: [] });
        mockApi.onGet('/product/soontoexpiry').reply(200, { data: [] });
        mockApi.onPost('/billing/checkout').reply(200, { data: { _id: 'inv1' } });

        const { getByPlaceholderText, getByText, getAllByText, getByDisplayValue } = render(<BillingScreen navigation={{setParams: jest.fn()}} route={{}} />);

        // Wait for product load
        await waitFor(() => {
            expect(mockApi.history.get.some(req => req.url === '/product/get')).toBeTruthy();
        });

        const searchInput = getByPlaceholderText('Scan barcode or type medicine name...');
        fireEvent.changeText(searchInput, 'Paracetamol');

        await waitFor(() => {
             expect(getByText('B1')).toBeTruthy();
        });

        // Click the older product (p1, index 0 assuming it sorted correctly, or we can just grab B1)
        fireEvent.press(getByText('B1'));

        await waitFor(() => {
             expect(getByText(/PAY ₹/)).toBeTruthy();
        });

        const payButton = getByText(/PAY ₹/);
        fireEvent.press(payButton);

        // Open PaymentModal
        await waitFor(() => {
            expect(getByText('Confirm Payment')).toBeTruthy();
        });

        const confirmBtn = getByText('Confirm Payment');
        fireEvent.press(confirmBtn);

        // Try pressing again to test duplicate prevention
        fireEvent.press(confirmBtn);

        await waitFor(() => {
            expect(mockApi.history.post.filter(req => req.url === '/billing/checkout').length).toBe(1);
        });

        const payload = JSON.parse(mockApi.history.post.find(req => req.url === '/billing/checkout').data);
        expect(payload.items).toHaveLength(1);
        expect(payload.items[0].product_id).toBe('p1');
        // PAY amount after default 15% discount on 50 is 42.5
        expect(payload.amount_paid).toBe(42.5);
    });

    it('prevents selling above available stock', async () => {
        mockApi.onGet('/product/get').reply(200, { data: mockProducts });
        mockApi.onGet('/sales/history').reply(200, { data: [] });
        mockApi.onGet('/product/lowstock').reply(200, { data: [] });
        mockApi.onGet('/product/soontoexpiry').reply(200, { data: [] });

        const { getByPlaceholderText, getByText, getAllByText, getByDisplayValue } = render(<BillingScreen navigation={{setParams: jest.fn()}} route={{}} />);

        await waitFor(() => {
            expect(mockApi.history.get.some(req => req.url === '/product/get')).toBeTruthy();
        });

        const searchInput = getByPlaceholderText('Scan barcode or type medicine name...');
        fireEvent.changeText(searchInput, 'Paracetamol');

        await waitFor(() => {
             expect(getByText('B2')).toBeTruthy();
        });

        // Force select B1
        fireEvent.press(getByText('B1'));
        
        await waitFor(() => {
             expect(getByText(/PAY ₹/)).toBeTruthy();
        });

        // The stock limit is 10 for p1 (B1).
        // The input for quantity starts at 1
        const qtyInput = getByDisplayValue('1');
        fireEvent.changeText(qtyInput, '11');

        await waitFor(() => {
            expect(Alert.alert).toHaveBeenCalledWith('Stock Limit', expect.stringContaining('Only 10 units available.'));
        });
    });

    it('shows FEFO warning when newer batch is selected before older', async () => {
        mockApi.onGet('/product/get').reply(200, { data: mockProducts });
        mockApi.onGet('/sales/history').reply(200, { data: [] });
        mockApi.onGet('/product/lowstock').reply(200, { data: [] });
        mockApi.onGet('/product/soontoexpiry').reply(200, { data: [] });

        const { getByPlaceholderText, getByText, getAllByText } = render(<BillingScreen navigation={{setParams: jest.fn()}} route={{}} />);

        await waitFor(() => {
            expect(mockApi.history.get.some(req => req.url === '/product/get')).toBeTruthy();
        });

        const searchInput = getByPlaceholderText('Scan barcode or type medicine name...');
        fireEvent.changeText(searchInput, 'Paracetamol');

        await waitFor(() => {
             expect(getByText('B2')).toBeTruthy();
        });

        // B2 is newer. B1 is older. Selecting B2 should trigger FEFO warning.
        fireEvent.press(getByText('B2'));

        await waitFor(() => {
            expect(getByText('FEFO Policy Violation')).toBeTruthy();
        });
    });

    it('handles API failures gracefully on checkout', async () => {
        mockApi.onGet('/product/get').reply(200, { data: mockProducts });
        mockApi.onGet('/sales/history').reply(200, { data: [] });
        mockApi.onGet('/product/lowstock').reply(200, { data: [] });
        mockApi.onGet('/product/soontoexpiry').reply(200, { data: [] });
        mockApi.onPost('/billing/checkout').reply(500, { message: 'Server error' });

        const { getByPlaceholderText, getByText, getByDisplayValue } = render(<BillingScreen navigation={{setParams: jest.fn()}} route={{}} />);

        await waitFor(() => {
            expect(mockApi.history.get.some(req => req.url === '/product/get')).toBeTruthy();
        });

        const searchInput = getByPlaceholderText('Scan barcode or type medicine name...');
        fireEvent.changeText(searchInput, 'Paracetamol');

        await waitFor(() => {
             expect(getByText('B1')).toBeTruthy();
        });

        fireEvent.press(getByText('B1'));

        await waitFor(() => {
             expect(getByText(/PAY ₹/)).toBeTruthy();
        });

        fireEvent.press(getByText(/PAY ₹/));

        await waitFor(() => {
            expect(getByText('Confirm Payment')).toBeTruthy();
        });

        fireEvent.press(getByText('Confirm Payment'));

        await waitFor(() => {
            expect(Alert.alert).toHaveBeenCalledWith('Checkout Failed', 'Server error');
        });
    });
});
