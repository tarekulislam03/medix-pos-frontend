import React, { useRef } from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    View,
    Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.97,
            useNativeDriver: true,
            speed: 20,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 20,
        }).start();
    };

    const gradientColors = {
        primary: [COLORS.primaryLight, COLORS.primary, COLORS.primaryDark],
        secondary: [COLORS.bgSurface, COLORS.bgSurface, COLORS.bgSurface],
        success: [COLORS.successLight, COLORS.success, COLORS.success],
        danger: [COLORS.errorLight, COLORS.error, COLORS.error],
    }[variant];

    const txtColor = variant === 'secondary' ? COLORS.textPrimary : COLORS.white;

    return (
        <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled || loading}
                activeOpacity={0.85}
                style={[
                    styles.buttonContainer,
                    small ? styles.buttonSmall : styles.buttonNormal,
                ]}
            >
                <LinearGradient
                    colors={disabled ? [COLORS.border, COLORS.border] : gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                        styles.gradient,
                        small ? styles.buttonSmall : styles.buttonNormal,
                        variant === 'secondary' && { borderWidth: 1.5, borderColor: COLORS.border }
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
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    buttonContainer: {
        borderRadius: RADIUS.md,
        ...SHADOWS.md,
        overflow: 'hidden',
    },
    gradient: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.md,
        width: '100%',
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
