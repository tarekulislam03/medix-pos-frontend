import React, { memo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../constants/theme';

const CartItem = ({ item, onQuantityChange, onDiscountChange, onRemove }) => {
    const unitPrice = item.mrp ?? item.selling_price ?? item.price ?? 0;
    const discount = item.discount_percent ?? 0;
    const qty = item.cart_quantity ?? 1;
    const lineTotal = unitPrice * qty * (1 - discount / 100);
    const name = item.medicine_name || item.product_name || item.name || '—';

    return (
        <View style={styles.container}>
            {/* Top row: name + remove */}
            <View style={styles.topRow}>
                <View style={styles.nameSection}>
                    <Text style={styles.name} numberOfLines={1}>
                        {name}
                    </Text>
                    <Text style={styles.unitPrice}>₹{Number(unitPrice).toFixed(2)} / unit</Text>
                </View>
                <TouchableOpacity
                    onPress={() => onRemove(item)}
                    style={styles.removeBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                </TouchableOpacity>
            </View>

            {/* Controls row */}
            <View style={styles.controlsRow}>
                {/* Quantity */}
                <View style={styles.qtySection}>
                    <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => onQuantityChange(item, qty - 1)}
                    >
                        <Ionicons name="remove" size={18} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{qty}</Text>
                    <TouchableOpacity
                        style={[styles.qtyBtn, styles.qtyBtnPlus]}
                        onPress={() => onQuantityChange(item, qty + 1)}
                    >
                        <Ionicons name="add" size={18} color={COLORS.white} />
                    </TouchableOpacity>
                </View>

                {/* Discount */}
                <View style={styles.discountSection}>
                    <TextInput
                        style={styles.discountInput}
                        value={String(discount)}
                        onChangeText={(val) => {
                            const num = parseFloat(val) || 0;
                            onDiscountChange(item, Math.min(100, Math.max(0, num)));
                        }}
                        keyboardType="numeric"
                        maxLength={5}
                        selectTextOnFocus
                    />
                    <Text style={styles.percentLabel}>% off</Text>
                </View>

                {/* Line total */}
                <Text style={styles.lineTotal}>₹{lineTotal.toFixed(2)}</Text>
            </View>
        </View>
    );
};

export default memo(CartItem);

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.md,
        padding: SPACING.lg,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.md,
    },
    nameSection: {
        flex: 1,
        marginRight: SPACING.sm,
    },
    name: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    unitPrice: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
        marginTop: 3,
    },
    removeBtn: {
        padding: SPACING.sm,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.errorLight,
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    qtySection: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bgSurface,
        borderRadius: RADIUS.sm,
        overflow: 'hidden',
    },
    qtyBtn: {
        width: 42,
        height: 42,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.textMuted,
    },
    qtyBtnPlus: {
        backgroundColor: COLORS.primary,
    },
    qtyText: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        paddingHorizontal: SPACING.lg,
        minWidth: 50,
        textAlign: 'center',
    },
    discountSection: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bgInput,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: SPACING.sm,
        height: 42,
    },
    discountInput: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        width: 50,
        textAlign: 'center',
        padding: 0,
    },
    percentLabel: {
        color: COLORS.textMuted,
        fontSize: FONT_SIZES.sm,
        fontWeight: '500',
    },
    lineTotal: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: COLORS.primary,
        minWidth: 90,
        textAlign: 'right',
    },
});
