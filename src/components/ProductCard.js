import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, RADIUS, SPACING, SHADOWS } from '../constants/theme';

const ProductCard = ({ product, onAdd }) => {
    const stock = product.quantity ?? product.stock ?? 0;
    const inStock = stock > 0;
    const name = product.medicine_name || product.product_name || product.name || '—';
    const price = product.mrp ?? product.selling_price ?? product.price ?? 0;

    return (
        <TouchableOpacity
            style={[styles.card, !inStock && styles.outOfStock]}
            onPress={() => inStock && onAdd(product)}
            activeOpacity={inStock ? 0.7 : 1}
        >
            <View style={styles.iconContainer}>
                <Ionicons name="medical-outline" size={24} color={COLORS.primary} />
            </View>

            <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                    {name}
                </Text>
                <Text style={styles.detail}>
                    {product.supplier_name || product.manufacturer || product.brand || 'Generic'}
                </Text>
            </View>

            <View style={styles.rightSection}>
                <Text style={styles.price}>₹{Number(price).toFixed(2)}</Text>
                <View
                    style={[
                        styles.stockBadge,
                        inStock ? styles.stockIn : styles.stockOut,
                    ]}
                >
                    <Text
                        style={[
                            styles.stockText,
                            inStock ? styles.stockTextIn : styles.stockTextOut,
                        ]}
                    >
                        {inStock ? `${stock} in stock` : 'Out of stock'}
                    </Text>
                </View>
            </View>

            {inStock && (
                <View style={styles.addButton}>
                    <Ionicons name="add" size={22} color={COLORS.white} />
                </View>
            )}
        </TouchableOpacity>
    );
};

export default memo(ProductCard);

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.md,
        padding: SPACING.lg,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
    },
    outOfStock: {
        opacity: 0.45,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primaryGhost,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: FONT_SIZES.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 3,
    },
    detail: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textMuted,
    },
    rightSection: {
        alignItems: 'flex-end',
        marginRight: SPACING.md,
    },
    price: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        color: COLORS.primary,
        marginBottom: 4,
    },
    stockBadge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        borderRadius: RADIUS.full,
    },
    stockIn: {
        backgroundColor: COLORS.successLight,
    },
    stockOut: {
        backgroundColor: COLORS.errorLight,
    },
    stockText: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '600',
    },
    stockTextIn: {
        color: COLORS.success,
    },
    stockTextOut: {
        color: COLORS.error,
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
