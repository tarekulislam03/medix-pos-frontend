import React, { useState, useEffect, Suspense, lazy } from 'react';
import { View, TouchableOpacity, Pressable, StyleSheet, Text, Dimensions, Image, ActivityIndicator, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../components/Sidebar';
import GradientButton from '../components/GradientButton';

const BillingScreen = lazy(() => import('../screens/BillingScreen'));
const InventoryScreen = lazy(() => import('../screens/InventoryScreen'));
const AnalyticsScreen = lazy(() => import('../screens/AnalyticsScreen'));
const CustomersScreen = lazy(() => import('../screens/CustomersScreen'));
const ComingSoonScreen = lazy(() => import('../screens/ComingSoonScreen'));
const SettingsScreen = lazy(() => import('../screens/SettingsScreen'));

import { COLORS, SPACING, RADIUS, FONT_SIZES } from '../constants/theme';
import { useResponsive } from '../utils/responsive';
import { logoutUser } from '../services/authService';
import { AuthContext } from '../context/AuthContext';

// Screen label for the top bar & browser tab title
const SCREEN_TITLES = {
    Billing: 'Billing & POS',
    Customers: 'Customer Records',
    Inventory: 'Inventory Management',
    Purchase: 'Purchase Orders',
    SalesAnalytics: 'Reports & Analytics',
    Returns: 'Sales Returns',
    Suppliers: 'Supplier Directory',
    Expenses: 'Expense Tracking',
    Settings: 'System Settings',
};

const getFormattedDate = () => {
    const d = new Date();
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'long' });
    const year = d.getFullYear();

    const getOrdinalSuffix = (n) => {
        if (n > 3 && n < 21) return 'th';
        switch (n % 10) {
            case 1: return "st";
            case 2: return "nd";
            case 3: return "rd";
            default: return "th";
        }
    };

    return `${day}${getOrdinalSuffix(day)} ${month}, ${year}`;
};

const getOperationalDateStr = (d) => {
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
};

const getOperationalTimeStr = (d) => {
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, '0');
    return `${hoursStr}:${minutes} ${ampm}`;
};

export default function MainLayout({ navigation }) {
    const { signOut, storeData } = React.useContext(AuthContext);
    const [activeScreen, setActiveScreen] = useState('Billing');
    const [invoiceData, setInvoiceData] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    

    
    const r = useResponsive();

    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 10000);
        return () => clearInterval(timer);
    }, []);



    // Update browser tab title when active screen changes
    useEffect(() => {
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
            const label = SCREEN_TITLES[activeScreen] || activeScreen;
            document.title = `${label} — MediX POS`;
        }
    }, [activeScreen]);

    // ─── GLOBAL KEYBOARD SHORTCUTS ────────────────────────
    useEffect(() => {
        if (Platform.OS !== 'web') return;

        const handleGlobalKeyDown = (e) => {
            if (e.key === 'F4') {
                e.preventDefault();
                setActiveScreen('Inventory');
            } else if (e.key === 'F5') {
                e.preventDefault();
                setActiveScreen('SalesAnalytics');
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    const navigateTo = (screen, params) => {
        if (params?.invoice) {
            setInvoiceData(params.invoice);
        }
        setActiveScreen(screen);
        setSidebarOpen(false); // close drawer on navigate
    };

    const handleLogout = async () => {
        try {
            await logoutUser();
        } catch (error) {
            console.log('Logout API failed, clearing local session anyway');
        } finally {
            await signOut();
        }
    };

    const renderScreen = () => {
        const proxyNavigation = {
            navigate: (screen, params) => navigateTo(screen, params),
            goBack: () => setActiveScreen('Billing'),
        };

        let CurrentScreen = null;
        switch (activeScreen) {
            case 'Inventory':
                CurrentScreen = <InventoryScreen navigation={proxyNavigation} />;
                break;
            case 'Invoices':
                CurrentScreen = <ComingSoonScreen screenKey="Invoices" />;
                break;
            case 'Returns':
                CurrentScreen = <ComingSoonScreen screenKey="Returns" />;
                break;
            case 'Customers':
                CurrentScreen = <CustomersScreen />;
                break;
            case 'SalesAnalytics':
                CurrentScreen = <AnalyticsScreen navigation={proxyNavigation} />;
                break;
            case 'Purchase':
                CurrentScreen = <ComingSoonScreen screenKey="Purchase" />;
                break;
            case 'Suppliers':
                CurrentScreen = <ComingSoonScreen screenKey="Suppliers" />;
                break;
            case 'Expenses':
                CurrentScreen = <ComingSoonScreen screenKey="Expenses" />;
                break;
            case 'Settings':
                CurrentScreen = <SettingsScreen />;
                break;
            case 'Billing':
            default:
                CurrentScreen = <BillingScreen navigation={proxyNavigation} editInvoice={invoiceData} clearEditInvoice={() => setInvoiceData(null)} />;
                break;
        }

        return (
            <Suspense fallback={
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgDark }}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            }>
                {CurrentScreen}
            </Suspense>
        );
    };


    // Responsive drawer width
    const drawerWidth = r.pick({
        small: r.width * 0.92,
        medium: r.width * 0.75,
        large: 680,
        xlarge: 720,
    });


    return (
        <View style={styles.container}>
            {/* Top Bar */}
            <View style={styles.topBar}>
                <View style={styles.topBarLeft}>
                    <View style={styles.topBarBrand}>
                        <Image
                            source={require('../../assets/icon.png')}
                            style={{
                                width: 22,
                                height: 22
                            }}
                            resizeMode="contain"
                        />
                        <Text style={styles.topBarTitle}>MediX POS & ERP</Text>
                    </View>
                </View>

                {/* Top Bar Right: Operational Info */}
                <View style={styles.topBarRight}>
                    <Text style={[styles.topBarOperationalInfo, { fontSize: r.isSmall ? 10 : 12 }]}>
                    {getOperationalDateStr(currentTime)} | {getOperationalTimeStr(currentTime)}
                    </Text>
                </View>
            </View>

            {/* Main Area: Sidebar + Content */}
            <View style={styles.mainArea}>
                <Sidebar
                    activeScreen={activeScreen}
                    onNavigate={navigateTo}
                    onLogout={handleLogout}
                />
                <View style={styles.content}>
                    {renderScreen()}
                </View>
            </View>


        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bgDark,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#24312E',
        height: 36,
        paddingHorizontal: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    topBarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    hamburgerBtn: {
        borderRadius: 4,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        width: 32,
        height: 26,
    },
    topBarBrand: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginLeft: 4,
    },
    topBarTitle: {
        fontWeight: '500',
        color: COLORS.white,
        fontSize: 14,
        letterSpacing: 1.0,
    },
    topBarDivider: {
        width: 1,
        height: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        marginHorizontal: 12,
    },
    topBarScreen: {
        fontWeight: '500',
        color: 'rgba(255,255,255,0.7)',
    },
    topBarRight: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 4,
    },
    topBarOperationalInfo: {
        color: 'rgba(255, 255, 255, 0.75)',
        fontWeight: '500',
        letterSpacing: 0.5,
    },
    mainArea: {
        flex: 1,
        flexDirection: 'row',
    },
    content: {
        flex: 1,
    },

});
