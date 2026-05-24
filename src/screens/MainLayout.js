import React, { useState, useEffect, Suspense, lazy } from 'react';
import { View, TouchableOpacity, Pressable, StyleSheet, Text, Dimensions, Image, ActivityIndicator, Platform, Modal, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
    Billing: 'Point of Sale',
    Inventory: 'Inventory',
    Invoices: 'Invoices',
    Returns: 'Returns & Refunds',
    Customers: 'Customer Management',
    SalesAnalytics: 'Sales Analytics',
    Settings: 'Settings',
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

export default function MainLayout({ navigation }) {
    const { signOut, storeData } = React.useContext(AuthContext);
    const [activeScreen, setActiveScreen] = useState('Billing');
    const [invoiceData, setInvoiceData] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    // Welcome curtain animation states
    const [isOpening, setIsOpening] = useState(false);
    const curtainAnim = React.useRef(new Animated.Value(0)).current;
    const animPulse = React.useRef(new Animated.Value(1)).current;
    const logoEntryAnim = React.useRef(new Animated.Value(0)).current;
    
    const r = useResponsive();

    useEffect(() => {
        const checkJustLoggedIn = async () => {
            try {
                let justLoggedIn = false;
                if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
                    justLoggedIn = window.sessionStorage.getItem('medix_just_logged_in') === 'true';
                    if (justLoggedIn) {
                        window.sessionStorage.removeItem('medix_just_logged_in');
                    }
                } else {
                    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                    const val = await AsyncStorage.getItem('medix_just_logged_in');
                    justLoggedIn = val === 'true';
                    if (justLoggedIn) {
                        await AsyncStorage.removeItem('medix_just_logged_in');
                    }
                }

                if (justLoggedIn) {
                    setIsOpening(true);
                }
            } catch (err) {
                console.warn('Error checking login status for animation:', err);
            }
        };
        
        checkJustLoggedIn();
    }, []);

    useEffect(() => {
        if (isOpening) {
            // Reset anim values
            curtainAnim.setValue(0);
            animPulse.setValue(1);
            logoEntryAnim.setValue(0);

            // 1. Spring entrance for the logo brand
            Animated.spring(logoEntryAnim, {
                toValue: 1,
                tension: 40,
                friction: 6,
                useNativeDriver: true,
            }).start();

            // 2. Start logo breathing pulse animation
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(animPulse, {
                        toValue: 1.04,
                        duration: 750,
                        useNativeDriver: true,
                    }),
                    Animated.timing(animPulse, {
                        toValue: 0.96,
                        duration: 750,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();

            // 3. Wait 800ms, then pull open the curtains
            Animated.sequence([
                Animated.delay(800),
                Animated.timing(curtainAnim, {
                    toValue: 1,
                    duration: 1300,
                    easing: Easing.bezier(0.3, 1.05, 0.4, 1.05), // Snappy elastic ease-out
                    useNativeDriver: true,
                })
            ]).start(() => {
                pulse.stop();
                setIsOpening(false);
            });

            return () => {
                pulse.stop();
            };
        }
    }, [isOpening]);

    // Update browser tab title when active screen changes
    useEffect(() => {
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
            const label = SCREEN_TITLES[activeScreen] || activeScreen;
            document.title = `${label} — MediX POS`;
        }
    }, [activeScreen]);

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

    const topBarHeight = r.pick({ small: 44, medium: 48, large: 52, xlarge: 56 });

    const leftTranslate = curtainAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -r.width / 4],
    });

    const rightTranslate = curtainAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, r.width / 4],
    });

    const curtainScaleX = curtainAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.01],
    });

    const logoOpacity = curtainAnim.interpolate({
        inputRange: [0, 0.35, 1],
        outputRange: [1, 0, 0],
    });

    const seamOpacity = curtainAnim.interpolate({
        inputRange: [0, 0.25, 1],
        outputRange: [1, 0.5, 0],
    });

    const logoScale = Animated.multiply(
        logoEntryAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.4, 1],
        }),
        curtainAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.35],
        })
    );

    const finalLogoScale = Animated.multiply(logoScale, animPulse);

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
                                {SCREEN_TITLES[activeScreen] || activeScreen}
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

            {/* ─── THEATRE CURTAIN OPENING ANIMATION ─── */}
            {isOpening && (
                <View style={styles.curtainContainer}>
                    {/* Left Curtain Panel */}
                    <Animated.View style={[
                        styles.curtainPanel,
                        styles.curtainLeft,
                        {
                            transform: [
                                { translateX: leftTranslate },
                                { scaleX: curtainScaleX }
                            ]
                        }
                    ]}>
                        <LinearGradient
                            colors={['#070D19', '#0B1528']}
                            style={styles.curtainGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                        <Animated.View style={[styles.curtainSeamRight, { opacity: seamOpacity }]} />
                    </Animated.View>

                    {/* Right Curtain Panel */}
                    <Animated.View style={[
                        styles.curtainPanel,
                        styles.curtainRight,
                        {
                            transform: [
                                { translateX: rightTranslate },
                                { scaleX: curtainScaleX }
                            ]
                        }
                    ]}>
                        <LinearGradient
                            colors={['#0B1528', '#070D19']}
                            style={styles.curtainGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                        <Animated.View style={[styles.curtainSeamLeft, { opacity: seamOpacity }]} />
                    </Animated.View>

                    {/* Seam vertical glow line */}
                    <Animated.View style={[
                        styles.curtainCenterGlowLine,
                        {
                            opacity: logoOpacity,
                            transform: [
                                {
                                    scaleX: animPulse.interpolate({
                                        inputRange: [0.95, 1.05],
                                        outputRange: [0.8, 1.3]
                                    })
                                }
                            ]
                        }
                    ]} />

                    {/* Centered Glowing Logo & Brand */}
                    <Animated.View style={[
                        styles.curtainCenterContent,
                        { opacity: logoOpacity, transform: [{ scale: finalLogoScale }] }
                    ]}>
                        <View style={styles.curtainLogoGlow} />
                        <Image
                            source={require('../../assets/icon.png')}
                            style={styles.curtainLogo}
                            resizeMode="contain"
                        />
                        <Text style={styles.curtainTitle}>MediX</Text>
                        <Text style={styles.curtainSubtitle}>Workspace is ready</Text>
                    </Animated.View>
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
    // Theatre Curtain Animation Styles
    curtainContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        elevation: 99999,
        flexDirection: 'row',
        overflow: 'hidden',
    },
    curtainPanel: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: '50%',
        height: '100%',
    },
    curtainLeft: {
        left: 0,
    },
    curtainRight: {
        right: 0,
    },
    curtainGradient: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    curtainSeamRight: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 1.5,
        backgroundColor: 'rgba(79, 163, 154, 0.35)',
        shadowColor: '#4FA39A',
        shadowOffset: { width: -2, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
    },
    curtainSeamLeft: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: 1.5,
        backgroundColor: 'rgba(79, 163, 154, 0.35)',
        shadowColor: '#4FA39A',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
    },
    curtainCenterContent: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
    },
    curtainLogoGlow: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(79, 163, 154, 0.12)',
        filter: Platform.OS === 'web' ? 'blur(60px)' : undefined,
        zIndex: -1,
    },
    curtainLogo: {
        width: 80,
        height: 80,
        marginBottom: SPACING.md,
    },
    curtainTitle: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    curtainSubtitle: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '600',
        color: 'rgba(79, 163, 154, 0.6)',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    curtainCenterGlowLine: {
        position: 'absolute',
        top: 0,
        left: '50%',
        bottom: 0,
        width: 3,
        marginLeft: -1.5,
        backgroundColor: 'rgba(79, 163, 154, 0.7)',
        shadowColor: '#4FA39A',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
        zIndex: 99999,
    },
});
