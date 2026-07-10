import React from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

const NAV_ITEMS = [
    { key: 'Billing', label: 'BILLING', icon: 'cart-outline' },
    { key: 'Customers', label: 'CUSTOMERS', icon: 'people-outline' },
    { key: 'Inventory', label: 'INVENTORY', icon: 'cube-outline' },
    { key: 'Purchase', label: 'PURCHASE', icon: 'card-outline' },
    { key: 'StockLedger', label: 'LEDGER', icon: 'list-outline' },
    { key: 'SalesAnalytics', label: 'REPORTS', icon: 'bar-chart-outline' },
    { key: 'Returns', label: 'RETURNS', icon: 'return-down-back-outline' },
    { key: 'Settings', label: 'SETTINGS', icon: 'settings-outline' },
    { key: 'Bored', label: 'ARE YOU BORED?', icon: 'game-controller-outline' },
];

export default function Sidebar({ activeScreen, onNavigate, onLogout }) {
    return (
        <View style={styles.panel}>
            {/* Navigation List */}
            <View style={styles.navContainer}>
                {NAV_ITEMS.map((item) => {
                    const isActive = activeScreen === item.key || (item.key === 'SalesAnalytics' && activeScreen === 'Reports');
                    return (
                        <Pressable
                            key={item.key}
                            onPress={() => onNavigate(item.key)}
                            style={({ hovered }) => [
                                styles.navItem,
                                isActive && styles.navItemActive,
                                hovered && !isActive && styles.navItemHovered,
                            ]}
                        >
                            <Ionicons
                                name={item.icon}
                                size={14}
                                color={isActive ? '#FFFFFF' : '#A0B2AD'}
                                style={styles.icon}
                            />
                            <Text style={[styles.label, isActive && styles.labelActive]}>
                                {item.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {/* Compact Footer */}
            <View style={styles.footer}>
                <Pressable
                    onPress={onLogout}
                    style={({ hovered }) => [
                        styles.logoutBtn,
                        hovered && styles.navItemHovered,
                    ]}
                >
                    <Ionicons
                        name="log-out-outline"
                        size={14}
                        color="#E74C3C"
                        style={styles.icon}
                    />
                    <Text style={styles.logoutText}>LOGOUT</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    panel: {
        width: 125,
        backgroundColor: '#1E2624',
        borderRightWidth: 0.5,
        borderRightColor: '#CDD5D1',
        height: '100%',
        flexDirection: 'column',
    },
    navContainer: {
        flex: 1,
        paddingTop: 4,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 30,
        paddingHorizontal: 12,
        backgroundColor: 'transparent',
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        borderLeftWidth: 3,
        borderLeftColor: 'transparent',
    },
    navItemActive: {
        backgroundColor: '#263431',
        borderLeftColor: '#4FA39A', // Green active indicator border
    },
    navItemHovered: {
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    icon: {
        marginRight: 10,
        width: 16,
        textAlign: 'center',
    },
    label: {
        color: '#A0B2AD',
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    labelActive: {
        color: '#FFFFFF',
    },
    footer: {
        borderTopWidth: 0.5,
        borderTopColor: 'rgba(255,255,255,0.08)',
        backgroundColor: '#181F1D',
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 38,
        paddingHorizontal: 12,
        borderLeftWidth: 3,
        borderLeftColor: 'transparent',
    },
    logoutText: {
        color: '#E74C3C',
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
});
