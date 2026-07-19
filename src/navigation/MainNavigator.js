import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import BillingScreen from '../screens/BillingScreen';
import InventoryScreen from '../screens/InventoryScreen';
import CustomersScreen from '../screens/CustomersScreen';
import ReturnScreen from '../screens/ReturnScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import PurchaseScreen from '../screens/purchaseScreen';
import AdminPurchaseUploadScreen from '../screens/AdminPurchaseUploadScreen';
import AdminAutoImportBillsScreen from '../screens/AdminAutoImportBillsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import GstFilingScreen from '../screens/GstFilingScreen';
import ComingSoonScreen from '../screens/ComingSoonScreen';
import BoredScreen from '../screens/BoredScreen';
import StockLedgerScreen from '../screens/StockLedgerScreen';
import SavingsScreen from '../screens/SavingsScreen';

const Stack = createNativeStackNavigator();

export default function MainNavigator() {
    return (
        <Stack.Navigator
            initialRouteName="Billing"
            screenOptions={{
                headerShown: false,
                animation: 'fade',
            }}
        >
            <Stack.Screen name="Billing" component={BillingScreen} />
            <Stack.Screen name="Inventory" component={InventoryScreen} />
            <Stack.Screen name="Customers" component={CustomersScreen} />
            <Stack.Screen name="Returns" component={ReturnScreen} />
            <Stack.Screen name="Purchase" component={PurchaseScreen} />
            <Stack.Screen name="AdminPurchaseUpload" component={AdminPurchaseUploadScreen} />
            <Stack.Screen name="AdminAutoImportBills" component={AdminAutoImportBillsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="SalesAnalytics" component={AnalyticsScreen} />
            <Stack.Screen name="GstFiling" component={GstFilingScreen} />
            <Stack.Screen name="Invoices">
                {() => <ComingSoonScreen screenKey="Invoices" />}
            </Stack.Screen>
            <Stack.Screen name="Bored" component={BoredScreen} />
            <Stack.Screen name="StockLedger" component={StockLedgerScreen} />
            <Stack.Screen name="Savings" component={SavingsScreen} />
        </Stack.Navigator>
    );
}
