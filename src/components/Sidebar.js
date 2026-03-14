import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { useResponsive } from '../utils/responsive';

// ── Add new pages here — they'll appear in the menu automatically ──
const NAV_ITEMS = [
    { key: 'Billing', label: 'New Sale', subLabel: 'Point of Sale', icon: 'cart-outline', num: '1' },
    { key: 'Inventory', label: 'Inventory', subLabel: 'Stock & Products', icon: 'cube-outline', num: '2' },
    { key: 'Returns', label: 'Returns', subLabel: 'Refunds & Exchanges', icon: 'return-down-back-outline', num: '3' },
    { key: 'Customers', label: 'Customers', subLabel: 'Customer Mgmt', icon: 'people-outline', num: '4' },
    { key: 'SalesAnalytics', label: 'Analytics', subLabel: 'Sales & Reports', icon: 'bar-chart-outline', num: '5' },
    { key: 'Settings', label: 'Settings', subLabel: 'Store & Config', icon: 'settings-outline', num: '6' },
];

export default function Sidebar({ activeScreen, onNavigate, onLogout, onClose }) {
    const r = useResponsive();

    return (
        <View style={styles.panel}>
            {/* ── Header ── */}
            <View style={styles.header}>
                <View style={styles.brandGroup}>
                    <View style={styles.logoCircle}>
                        <Image
                            source={require('../../assets/icon.png')}
                            style={{ width: 34, height: 34 }}
                            resizeMode="contain"
                        />
                    </View>
                    <View>
                        <Text style={styles.brandName}>MediX</Text>
                        <Text style={styles.headerSub}>Control Center</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.closeIconBtn} onPress={onClose}>
                    <Ionicons name="close-outline" size={24} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
            </View>

            {/* ── Navigation Grid ── */}
            <View style={styles.navGrid}>
                {NAV_ITEMS.map((item) => {
                    const isActive = activeScreen === item.key;
                    const cardWidth = r.pick({ small: '47.5%', medium: '47.5%', large: '31%', xlarge: '31%' });

                    return (
                        <TouchableOpacity
                            key={item.key}
                            style={[
                                styles.navCard,
                                isActive && styles.navCardActive,
                                { width: cardWidth }
                            ]}
                            onPress={() => onNavigate(item.key)}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.iconBox, isActive && styles.iconBoxActive]}>
                                <Ionicons
                                    name={item.icon}
                                    size={22}
                                    color={isActive ? '#fff' : COLORS.primaryLight}
                                />
                            </View>
                            <View style={styles.cardLabels}>
                                <Text style={[styles.navLabel, isActive && styles.navLabelActive]} numberOfLines={1}>
                                    {item.label}
                                </Text>
                                <Text style={[styles.navSub, isActive && styles.navSubActive]} numberOfLines={1}>
                                    {item.subLabel}
                                </Text>
                            </View>
                            {isActive && <View style={styles.activePill} />}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* ── Footer ── */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.8}>
                    <View style={styles.logoutIconBox}>
                        <Ionicons name="log-out-outline" size={20} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.logoutText}>Logout session</Text>
                        <Text style={styles.logoutSub}>Exit your account</Text>
                    </View>
                    <Ionicons name="chevron-forward-outline" size={18} color="rgba(255,255,255,0.2)" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const PANEL_BG = '#152E2A';
const CARD_BG = '#1E3D38';
const CARD_BORDER = 'rgba(79,163,154,0.18)';

const styles = StyleSheet.create({
    panel: {
        flex: 1,
        backgroundColor: PANEL_BG,
        paddingTop: Platform.OS === 'ios' ? 44 : 0,
    },

    /* Header */
    header: {
        paddingHorizontal: 24,
        paddingVertical: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    brandGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    logoCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    brandName: {
        fontSize: 20,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 0.5,
    },
    headerSub: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    closeIconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    /* Navigation Grid */
    navGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 16,
        gap: 12,
        alignContent: 'flex-start',
        justifyContent: 'center',
    },
    navCard: {
        backgroundColor: CARD_BG,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        padding: 16,
        minHeight: 120,
        justifyContent: 'space-between',
        overflow: 'hidden',
    },
    navCardActive: {
        backgroundColor: COLORS.primary,
        borderColor: 'rgba(255,255,255,0.2)',
        elevation: 8,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },

    /* Icons */
    iconBox: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: 'rgba(79,163,154,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBoxActive: {
        backgroundColor: 'rgba(255,255,255,0.25)',
    },

    /* Card Labels */
    cardLabels: {
        marginTop: 10,
    },
    navLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 2,
    },
    navLabelActive: {
        color: '#fff',
    },
    navSub: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.45)',
        fontWeight: '500',
    },
    navSubActive: {
        color: 'rgba(255,255,255,0.8)',
    },

    /* Active indicator pill */
    activePill: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 4,
        height: 20,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.8)',
    },

    /* Footer */
    footer: {
        marginTop: 'auto',
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 32,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.06)',
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: 'rgba(231,76,60,0.1)',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(231,76,60,0.2)',
    },
    logoutIconBox: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: '#E74C3C',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    logoutSub: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
    },
});
