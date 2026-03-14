import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../constants/theme';
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
                <View style={styles.brandRow}>
                    <Image
                        source={require('../../assets/icon.png')}
                        style={{ width: 42, height: 42 }}
                        resizeMode="contain"
                    />
                    <Text style={styles.brandName}>MediX</Text>
                    <View style={styles.headerDivider} />
                    <Text style={styles.headerSub}>Navigation</Text>
                </View>
                <Text style={styles.headerHint}>Select a page to navigate</Text>
            </View>

            {/* ── 2-Column Nav Grid ── */}
            <View style={styles.navGrid}>
                {NAV_ITEMS.map((item) => {
                    const isActive = activeScreen === item.key;
                    // Responsive width: 1 column on small screens, 2 columns otherwise
                    const cardWidth = r.pick({ small: '100%', medium: '48%', large: '48%', xlarge: '31%' });

                    return (
                        <TouchableOpacity
                            key={item.key}
                            style={[styles.navCard, isActive && styles.navCardActive, { width: cardWidth }]}
                            onPress={() => onNavigate(item.key)}
                            activeOpacity={0.7}
                        >
                            {/* Icon */}
                            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                                <Ionicons
                                    name={item.icon}
                                    size={24}
                                    color={isActive ? '#fff' : COLORS.primaryLight}
                                />
                            </View>

                            {/* Labels */}
                            <Text style={[styles.navLabel, isActive && styles.navLabelActive]} numberOfLines={1}>
                                {item.label}
                            </Text>
                            <Text style={[styles.navSub, isActive && styles.navSubActive]} numberOfLines={1}>
                                {item.subLabel}
                            </Text>

                            {/* Active indicator dot */}
                            {isActive && <View style={styles.activeDot} />}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* ── Footer ── */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
                    <Ionicons name="close" size={18} color="#fff" />
                    <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.8}>
                    <Ionicons name="log-out-outline" size={18} color="#fff" />
                    <Text style={styles.logoutBtnText}>Logout</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const CARD_BG = '#1E3D38';
const CARD_BORDER = 'rgba(79,163,154,0.18)';
const PANEL_BG = '#152E2A';
const HEADER_BG = '#0F2320';

const styles = StyleSheet.create({
    panel: {
        flex: 1,
        backgroundColor: PANEL_BG,
        overflow: 'hidden',
    },

    /* Header */
    header: {
        backgroundColor: HEADER_BG,
        paddingHorizontal: 24,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(79,163,154,0.2)',
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    logoBox: {
        width: 28,
        height: 28,
        borderRadius: 7,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    brandName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.3,
    },
    headerDivider: {
        width: 1,
        height: 14,
        backgroundColor: 'rgba(255,255,255,0.18)',
    },
    headerSub: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.45)',
        fontWeight: '500',
    },
    headerHint: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.28)',
    },

    /* 2-Column Grid — sizes to content, not flex-stretched */
    navGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 16,
        paddingBottom: 20,
        gap: 12,
        alignContent: 'flex-start',
    },
    navCard: {
        backgroundColor: CARD_BG,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: 60,
        height: 'auto',
        justifyContent: 'flex-end',
        position: 'relative',
        overflow: 'hidden',
    },
    navCardActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primaryLight,
    },

    /* Icon */
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: 'rgba(79,163,154,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    iconWrapActive: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },

    /* Labels */
    navLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 3,
    },
    navLabelActive: {
        color: '#fff',
    },
    navSub: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        fontWeight: '400',
    },
    navSubActive: {
        color: 'rgba(255,255,255,0.7)',
    },

    /* Active dot — top-right corner */
    activeDot: {
        position: 'absolute',
        top: 14,
        right: 14,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.8)',
    },

    /* Footer */
    footer: {
        backgroundColor: HEADER_BG,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 20,
        paddingVertical: 13,
        borderTopWidth: 1,
        borderTopColor: 'rgba(79,163,154,0.2)',
    },
    closeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        backgroundColor: '#C0392B',
        paddingHorizontal: 18,
        paddingVertical: 9,
        borderRadius: 8,
    },
    closeBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.3,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    logoutBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.3,
    },
    userInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    userText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.45)',
        fontWeight: '400',
    },
});
