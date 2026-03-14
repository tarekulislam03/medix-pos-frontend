import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    View,
} from 'react-native';
import { COLORS, FONT_SIZES, RADIUS, SPACING, SHADOWS } from '../constants/theme';

export default function GradientButton({
    title,
    onPress,
    loading = false,
    disabled = false,
    style,
    textStyle,
    icon,
    small = false,
    variant = 'primary', // 'primary' | 'secondary' | 'success' | 'danger'
}) {
    const bgColor = {
        primary: COLORS.primary,
        secondary: COLORS.bgSurface,
        success: COLORS.success,
        danger: COLORS.error,
    }[variant];

    const txtColor = variant === 'secondary' ? COLORS.textPrimary : COLORS.white;

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.75}
            style={[
                styles.button,
                small ? styles.buttonSmall : styles.buttonNormal,
                {
                    backgroundColor: disabled ? COLORS.border : bgColor,
                    borderColor: variant === 'secondary' ? COLORS.border : 'transparent',
                    borderWidth: variant === 'secondary' ? 1.5 : 0,
                },
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={txtColor} size="small" />
            ) : (
                <View style={styles.inner}>
                    {icon}
                    <Text
                        style={[
                            styles.text,
                            small && styles.textSmall,
                            { color: txtColor },
                            icon && { marginLeft: SPACING.sm },
                            textStyle,
                        ]}
                    >
                        {title}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.sm,
    },
    buttonNormal: {
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xl,
        minHeight: 52,
    },
    buttonSmall: {
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.lg,
        minHeight: 42,
    },
    inner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontSize: FONT_SIZES.lg,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    textSmall: {
        fontSize: FONT_SIZES.sm,
        fontWeight: '600',
    },
});
