import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MockAdapter from 'axios-mock-adapter';
import api from '../services/api';
import AnalyticsScreen from '../screens/AnalyticsScreen';



describe('AnalyticsScreen', () => {
    let mock;

    beforeEach(() => {
        mock = new MockAdapter(api);
    });

    afterEach(() => {
        mock.reset();
    });

    it('displays daily, monthly sales and profit data correctly', async () => {
        mock.onGet('/sales/today').reply(200, { data: { total_sales: 1250.50 } });
        mock.onGet('/sales/monthly').reply(200, { data: { total_sales: 45000.75 } });
        
        mock.onGet('/sales/history').reply(200, { 
            data: [
                {
                    _id: 'sale_1',
                    invoice_number: 'INV-001',
                    grand_total: 100,
                    payment_method: 'cash',
                    created_at: new Date().toISOString()
                }
            ] 
        });

        const analyticsOverview = {
            dailyData: [
                { date: '2023-10-01', total: 1000 }
            ],
            monthlyData: [
                { monthId: '2023-10', month: 'October 2023', total: 20000 }
            ],
            dailyProfitData: [
                { date: '2023-10-01', profit: 350.25 }
            ],
            monthlyProfitData: [
                { monthId: '2023-10', month: 'October 2023', profit: 5000.50 }
            ]
        };

        mock.onGet('/sales/analytics-overview').reply(200, analyticsOverview);

        const { getByText, findByText, debug } = render(<AnalyticsScreen navigation={{}} />);

        // Wait for primary fetch
        await waitFor(() => {
            expect(getByText('₹1,250.50')).toBeTruthy();
            expect(getByText('₹45,000.75')).toBeTruthy();
        });

        // Click on "More Analytical Info"
        const moreInfoBtn = getByText('More Analytical Info');
        fireEvent.press(moreInfoBtn);

        // Wait for modal tables to render
        await waitFor(() => {
            expect(getByText('Detailed Sales Reports')).toBeTruthy();
        });

        // Check daily sales
        expect(getByText('2023-10-01')).toBeTruthy();
        expect(getByText('₹1000.00')).toBeTruthy();

        // Check monthly sales
        expect(getByText('October 2023')).toBeTruthy();
        expect(getByText('₹20000.00')).toBeTruthy();

        // Check daily profit calculation rendering
        expect(getByText('₹350.25')).toBeTruthy();

        // Check monthly profit rendering
        expect(getByText('₹5000.50')).toBeTruthy();
    });
});
