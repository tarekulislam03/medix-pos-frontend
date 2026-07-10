import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Image, TouchableOpacity, Modal, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import Sidebar from '../components/Sidebar';
import MainNavigator from '../navigation/MainNavigator';

import { COLORS } from '../constants/theme';
import { useResponsive } from '../utils/responsive';
import { logoutUser } from '../services/authService';
import { AuthContext } from '../context/AuthContext';
import { fetchStoreSettings } from '../utils/storeSettings';
import { getPurchases } from '../services/purchaseService';

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

export default function MainLayout() {
    const authContext = React.useContext(AuthContext) || {};
    const { signOut } = authContext;
    const navigation = useNavigation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const r = useResponsive();

    const [currentTime, setCurrentTime] = useState(new Date());
    const [storeSettings, setStoreSettings] = useState(null);
    const [unseenPurchases, setUnseenPurchases] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);

    useEffect(() => {
        const checkPurchases = async () => {
            // Only poll if the user is not a superadmin on admin screen (we just try to fetch store purchases)
            // If they are on an admin screen, this might fail or return admin data, but we can safely ignore errors.
            try {
                const res = await getPurchases();
                const newPurchases = res?.data ?? [];
                setUnseenPurchases(newPurchases.filter(p => p.needs_manual_review));
            } catch(e) {
                // Ignore API errors for admin users or unauthenticated state
            }
        };

        checkPurchases(); // Initial check

        const timer = setInterval(() => {
            setCurrentTime(new Date());
            checkPurchases();
        }, 10000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const s = await fetchStoreSettings({});
                if (mounted) setStoreSettings(s);
            } catch (e) {
                console.error('Failed to load settings', e);
            }
        })();
        return () => { mounted = false; };
    }, []);

    // Prepare notifications (bills only)
    const notifications = [...unseenPurchases].map(p => ({ ...p, sortDate: p.createdAt || p.updatedAt || new Date() }));
    notifications.sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate));
    const top5Notifications = notifications.slice(0, 5);
    const totalCount = unseenPurchases.length;

    // Derive active route from the child navigator's state
    const activeRoute = useNavigationState((state) => {
        // state is the parent (AppNavigator) state
        // Find the "Main" route in it
        const mainRoute = state?.routes?.find((r) => r.name === 'Main');
        // The child navigator's state lives under mainRoute.state
        const childState = mainRoute?.state;
        if (childState) {
            const activeIndex = childState.index ?? 0;
            return childState.routes?.[activeIndex]?.name ?? 'Billing';
        }
        return 'Billing';
    });

    const handleLogout = async () => {
        try {
            await logoutUser();
        } catch (error) {
            console.log('Logout API failed, clearing local session anyway');
        } finally {
            if (signOut) await signOut();
        }
    };

    return (
        <View style={styles.container}>
            {/* Top Bar */}
            <View style={styles.topBar}>
                <View style={styles.topBarLeft}>
                    {r.isSmall && (
                        <TouchableOpacity
                            style={styles.hamburgerBtn}
                            onPress={() => setSidebarOpen(true)}
                        >
                            <Ionicons name="menu" size={20} color={COLORS.white} />
                        </TouchableOpacity>
                    )}
                    <View style={styles.topBarBrand}>
                        <Image
                            source={require('../../assets/web-logo.png')}
                            style={{
                                width: r.isSmall ? 80 : 100,
                                height: r.isSmall ? 32 : 40,
                            }}
                            resizeMode="contain"
                        />

                    </View>
                </View>
                {!r.isSmall && (
                    <View style={styles.topBarCenter}>
                        <View style={styles.storeInfo}>
                            <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
                            <Text style={[styles.storeMeta, { marginLeft: 6, fontSize: 13 }]}>
                                If you are facing any problem using the software or facing any technical problems, please whatsapp you problem to this number <Text style={{ fontWeight: '700', color: '#FFFFFF' }}>8101402916</Text>
                            </Text>
                        </View>
                    </View>
                )}

                {/* Top Bar Right: Operational Info */}
                <View style={[styles.topBarRight, { zIndex: 10 }]}>
                    <TouchableOpacity 
                        onPress={() => setShowNotifications(!showNotifications)}
                        style={{ marginRight: 15, position: 'relative' }}
                    >
                        <Ionicons name="notifications-outline" size={20} color={COLORS.white} />
                        {totalCount > 0 && (
                            <View style={{
                                position: 'absolute',
                                top: -2,
                                right: -2,
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: COLORS.error,
                                borderWidth: 1,
                                borderColor: '#24312E'
                            }} />
                        )}
                    </TouchableOpacity>

                    {/* Notification Dropdown */}
                    {showNotifications && (
                        <Modal visible={true} transparent={true} animationType="none" onRequestClose={() => setShowNotifications(false)}>
                            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowNotifications(false)} />
                            <View style={{
                                position: 'absolute',
                                top: 45,
                                right: 15,
                                width: 280,
                                backgroundColor: '#24312E',
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: 'rgba(255,255,255,0.1)',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                                elevation: 5,
                                padding: 8,
                            }}>
                                <Text style={{ color: COLORS.white, fontWeight: '600', marginBottom: 8, paddingHorizontal: 4 }}>
                                    Notifications ({totalCount > 5 ? `5 of ${totalCount}` : totalCount})
                                </Text>
                                <View style={{ paddingRight: 4 }}>
                                    {totalCount === 0 ? (
                                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, paddingHorizontal: 4, paddingBottom: 8 }}>
                                            No new notifications
                                        </Text>
                                    ) : (
                                        <>
                                            {top5Notifications.map((n, idx) => (
                                                <TouchableOpacity 
                                                    key={`pur-${n._id || idx}`}
                                                    style={{
                                                        padding: 10,
                                                        backgroundColor: 'rgba(255,255,255,0.05)',
                                                        borderRadius: 6,
                                                        marginBottom: 6
                                                    }}
                                                    onPress={() => {
                                                        setShowNotifications(false);
                                                        navigation.navigate('Main', { screen: 'Purchase' });
                                                    }}
                                                >
                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        <Ionicons name="document-text-outline" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
                                                        <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: '500' }}>
                                                            Bill Processed
                                                        </Text>
                                                    </View>
                                                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 4 }}>
                                                        {n.supplier_name || 'A bill'} is ready for review
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </>
                                    )}
                                </View>
                            </View>
                        </Modal>
                    )}

                    <Text style={[styles.topBarOperationalInfo, { fontSize: r.isSmall ? 10 : 12 }]}>
                        {getOperationalDateStr(currentTime)} | {getOperationalTimeStr(currentTime)}
                    </Text>
                </View>
            </View>

            {/* Main Area: Sidebar + Content */}
            <View style={styles.mainArea}>
                {!r.isSmall && (
                    <Sidebar
                        activeScreen={activeRoute}
                        onNavigate={(screen) => navigation.navigate('Main', { screen })}
                        onLogout={handleLogout}
                    />
                )}
                <View style={styles.content}>
                    <MainNavigator />
                </View>
            </View>

            {/* Mobile Sidebar Overlay */}
            {r.isSmall && sidebarOpen && (
                <Modal visible={sidebarOpen} transparent={true} animationType="fade" onRequestClose={() => setSidebarOpen(false)}>
                    <View style={styles.modalOverlay}>
                        <Pressable style={styles.modalBackdrop} onPress={() => setSidebarOpen(false)} />
                        <View style={styles.mobileSidebarContainer}>
                            <Sidebar
                                activeScreen={activeRoute}
                                onNavigate={(screen) => {
                                    setSidebarOpen(false);
                                    navigation.navigate('Main', { screen });
                                }}
                                onLogout={handleLogout}
                            />
                        </View>
                    </View>
                </Modal>
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
        backgroundColor: '#24312E',
        height: 50,
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

        marginLeft: 5,
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
    modalOverlay: {
        flex: 1,
        flexDirection: 'row',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    mobileSidebarContainer: {
        width: 125,
        height: '100%',
        backgroundColor: '#1E2624',
        shadowColor: '#000',
        shadowOffset: { width: 5, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    topBarCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
},

storeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
},

storeName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginLeft: 6,
},

storeMeta: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 15,
    fontWeight: '500',
},

storeDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: 10,
},

});
