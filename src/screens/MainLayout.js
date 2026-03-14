import React, { useState } from 'react';
import { View, TouchableOpacity, Pressable, StyleSheet, Text, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../components/Sidebar';
import BillingScreen from '../screens/BillingScreen';
import InventoryScreen from '../screens/InventoryScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import CustomersScreen from '../screens/CustomersScreen';
import ComingSoonScreen from '../screens/ComingSoonScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { COLORS, SPACING, RADIUS, FONT_SIZES } from '../constants/theme';
import { useResponsive } from '../utils/responsive';
import { logoutUser } from '../services/authService';
import { AuthContext } from '../context/AuthContext';

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

export default function MainLayout({ navigation }) {
    const { signOut } = React.useContext(AuthContext);
    const [activeScreen, setActiveScreen] = useState('Billing');
    const [invoiceData, setInvoiceData] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const r = useResponsive();

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

        switch (activeScreen) {
            case 'Inventory':
                return <InventoryScreen navigation={proxyNavigation} />;
            case 'Invoices':
                return <ComingSoonScreen screenKey="Invoices" />;
            case 'Returns':
                return <ComingSoonScreen screenKey="Returns" />;
            case 'Customers':
                return <CustomersScreen />;
            case 'SalesAnalytics':
                return <AnalyticsScreen />;
            case 'Settings':
                return <SettingsScreen />;
            case 'Billing':
            default:
                return <BillingScreen navigation={proxyNavigation} />;
        }
    };

    // Screen label for the top bar
    const screenLabels = {
        Billing: 'Point of Sale',
        Inventory: 'Inventory',
        Invoices: 'Invoices',
        Returns: 'Returns & Refunds',
        Customers: 'Customer Management',
        SalesAnalytics: 'Sales Analytics',
        Settings: 'Settings',
    };

    // Responsive drawer width
    const drawerWidth = r.pick({
        small: r.width * 0.92,
        medium: r.width * 0.75,
        large: 680,
        xlarge: 720,
    });

    const topBarHeight = r.pick({ small: 44, medium: 48, large: 52, xlarge: 56 });

    return (
        <View style={styles.container}>
            {/* Top Bar with hamburger */}
            <View style={[styles.topBar, { height: topBarHeight, paddingHorizontal: r.pick({ small: SPACING.sm, medium: SPACING.md, large: SPACING.md, xlarge: SPACING.md }) }]}>
                <View style={styles.topBarLeft}>
                    <Pressable
                        style={({ pressed }) => [styles.hamburgerBtn, { width: r.pick({ small: 36, medium: 38, large: 42, xlarge: 42 }), height: r.pick({ small: 36, medium: 38, large: 42, xlarge: 42 }), opacity: pressed ? 0.7 : 1 }]}
                        onPress={() => setSidebarOpen(true)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="menu" size={r.pick({ small: 22, medium: 24, large: 26, xlarge: 26 })} color={COLORS.white} />
                    </Pressable>
                    <View style={styles.topBarBrand}>
                        <Image
                            source={require('../../assets/icon.png')}
                            style={{
                                width: r.pick({ small: 28, medium: 32, large: 34, xlarge: 34 }),
                                height: r.pick({ small: 28, medium: 32, large: 34, xlarge: 34 })
                            }}
                            resizeMode="contain"
                        />
                        <Text style={[styles.topBarTitle, { fontSize: r.pick({ small: 16, medium: 18, large: FONT_SIZES.lg, xlarge: FONT_SIZES.lg }) }]}>MediX</Text>
                    </View>
                    {!r.isSmall && (
                        <>
                            <View style={styles.topBarDivider} />
                            <Text style={[styles.topBarScreen, { fontSize: r.pick({ medium: 14, large: FONT_SIZES.md, xlarge: FONT_SIZES.md }) }]}>
                                {screenLabels[activeScreen] || activeScreen}
                            </Text>
                        </>
                    )}
                </View>

                {/* Top Bar Right: Current Date */}
                <View style={styles.topBarRight}>
                    <Text style={[styles.topBarDate, { fontSize: r.pick({ small: 12, medium: 14, large: FONT_SIZES.md, xlarge: FONT_SIZES.md }) }]}>
                        {getFormattedDate()}
                    </Text>
                </View>
            </View>

            {/* Content */}
            <View style={styles.content}>{renderScreen()}</View>

            {/* Floating Sidebar Panel */}
            {sidebarOpen && (
                <View style={styles.drawerOverlay} pointerEvents="box-none">
                    {/* Backdrop — tap to close */}
                    <Pressable
                        style={styles.backdrop}
                        onPress={() => setSidebarOpen(false)}
                    />
                    {/* Floating panel - slides from left */}
                    <View style={[
                        styles.drawerPanel,
                        {
                            width: drawerWidth,
                            borderRadius: r.isSmall ? 0 : r.pick({ medium: 16, large: 18, xlarge: 18 }),
                            height: r.isSmall ? '100%' : 'auto',
                            maxHeight: r.isSmall ? '100%' : '90%',
                            alignSelf: r.isSmall ? 'stretch' : 'center'
                        }
                    ]}>
                        <Sidebar
                            activeScreen={activeScreen}
                            onNavigate={navigateTo}
                            onLogout={handleLogout}
                            onClose={() => setSidebarOpen(false)}
                        />
                    </View>
                </View>
            )}
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
        backgroundColor: COLORS.bgSidebar,
        paddingVertical: SPACING.sm,
    },
    topBarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    hamburgerBtn: {
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    topBarBrand: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginLeft: SPACING.xs,
    },
    topBarTitle: {
        fontWeight: '800',
        color: COLORS.white,
        letterSpacing: 0.5,
    },
    topBarDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginHorizontal: SPACING.sm,
    },
    topBarScreen: {
        fontWeight: '500',
        color: 'rgba(255,255,255,0.7)',
    },
    topBarRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    topBarDate: {
        color: 'rgba(255,255,255,0.85)',
        fontWeight: '500',
    },
    content: {
        flex: 1,
    },

    // Sidebar overlay + floating panel
    drawerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        elevation: 1000,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
    },
    drawerPanel: {
        overflow: 'hidden',
        elevation: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.45,
        shadowRadius: 32,
        zIndex: 1001,
        maxHeight: '90%',
    },
});
