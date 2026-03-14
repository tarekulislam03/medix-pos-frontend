import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../constants/theme';

const METHODS = [
    { key: 'cash', label: 'Cash', icon: 'cash-outline' },
    { key: 'upi', label: 'UPI', icon: 'phone-portrait-outline' },
    { key: 'card', label: 'Card', icon: 'card-outline' },
];

export default function PaymentMethodSelector({ selected, onSelect }) {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.row}>
                {METHODS.map((method) => {
                    const isActive = selected === method.key;
                    return (
                        <TouchableOpacity
                            key={method.key}
                            style={[styles.methodBtn, isActive && styles.methodBtnActive]}
                            onPress={() => onSelect(method.key)}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={method.icon}
                                size={22}
                                color={isActive ? COLORS.white : COLORS.textMuted}
                            />
                            <Text
                                style={[
                                    styles.methodText,
                                    isActive && styles.methodTextActive,
                                ]}
                            >
                                {method.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.lg,
    },
    label: {
        fontSize: FONT_SIZES.sm,
        color: COLORS.textMuted,
        fontWeight: '600',
        marginBottom: SPACING.sm,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    row: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    methodBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.md,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.white,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        minHeight: 52,
    },
    methodBtnActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primaryDark,
    },
    methodText: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    methodTextActive: {
        color: COLORS.white,
    },
});
