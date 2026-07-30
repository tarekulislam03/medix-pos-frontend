import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../../../core/constants/theme';

const ARENA_W = 700;
const ARENA_H = 400;
const PLAYER_SIZE = 20;
const BULLET_SPEED = 10;
const ENEMY_SPEED_BASE = 1.5;
const PLAYER_SPEED = 5;
const FIRE_RATE = 150; // ms between shots

const playSound = (type) => {
    if (Platform.OS !== 'web') return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'shoot') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.06);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
            osc.start();
            osc.stop(ctx.currentTime + 0.08);
        } else if (type === 'hit') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.06);
            gain.gain.setValueAtTime(0.06, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } else if (type === 'dead') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.4);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
        }
    } catch (e) { /* ignore */ }
};

const ShooterGame = () => {
    const [gameState, setGameState] = useState('START');
    const [score, setScore] = useState(0);
    const [hp, setHp] = useState(5);
    const [wave, setWave] = useState(1);
    const [renderTick, setRenderTick] = useState(0);

    const player = useRef({ x: ARENA_W / 2, y: ARENA_H - 40 });
    const bullets = useRef([]);
    const enemies = useRef([]);
    const particles = useRef([]);
    const keys = useRef({});
    const scoreRef = useRef(0);
    const hpRef = useRef(5);
    const waveRef = useRef(1);
    const frameRef = useRef(0);
    const lastFireRef = useRef(0);
    const aimAngle = useRef(-Math.PI / 2); // aim up by default
    const animRef = useRef(null);
    const arenaRef = useRef(null);

    const { width: windowWidth } = useWindowDimensions();
    const scaleFactor = Math.min(1, (windowWidth - 60) / ARENA_W);

    const spawnEnemy = () => {
        const side = Math.floor(Math.random() * 3); // 0=top, 1=left, 2=right
        let x, y, vx, vy;
        const speed = ENEMY_SPEED_BASE + (waveRef.current - 1) * 0.3 + Math.random() * 0.5;

        if (side === 0) {
            x = Math.random() * ARENA_W;
            y = -15;
            const angle = Math.atan2(player.current.y - y, player.current.x - x);
            vx = Math.cos(angle) * speed;
            vy = Math.sin(angle) * speed;
        } else if (side === 1) {
            x = -15;
            y = Math.random() * (ARENA_H * 0.6);
            const angle = Math.atan2(player.current.y - y, player.current.x - x);
            vx = Math.cos(angle) * speed;
            vy = Math.sin(angle) * speed;
        } else {
            x = ARENA_W + 15;
            y = Math.random() * (ARENA_H * 0.6);
            const angle = Math.atan2(player.current.y - y, player.current.x - x);
            vx = Math.cos(angle) * speed;
            vy = Math.sin(angle) * speed;
        }

        const types = ['triangle', 'diamond', 'circle'];
        enemies.current.push({
            x, y, vx, vy, hp: 1, size: 14 + Math.random() * 6,
            type: types[Math.floor(Math.random() * types.length)],
            color: ['#EF4444', '#F97316', '#A855F7', '#EC4899'][Math.floor(Math.random() * 4)],
        });
    };

    const shoot = () => {
        const now = Date.now();
        if (now - lastFireRef.current < FIRE_RATE) return;
        lastFireRef.current = now;

        const angle = aimAngle.current;
        bullets.current.push({
            x: player.current.x,
            y: player.current.y - 8,
            vx: Math.cos(angle) * BULLET_SPEED,
            vy: Math.sin(angle) * BULLET_SPEED,
        });
        playSound('shoot');
    };

    const addParticles = (x, y, color) => {
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            particles.current.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 20 + Math.floor(Math.random() * 10),
                color,
                size: 2 + Math.random() * 3,
            });
        }
    };

    const initGame = () => {
        player.current = { x: ARENA_W / 2, y: ARENA_H - 40 };
        bullets.current = [];
        enemies.current = [];
        particles.current = [];
        keys.current = {};
        scoreRef.current = 0;
        hpRef.current = 5;
        waveRef.current = 1;
        frameRef.current = 0;
        lastFireRef.current = 0;
        aimAngle.current = -Math.PI / 2;
        setScore(0);
        setHp(5);
        setWave(1);
    };

    const gameLoop = useCallback(() => {
        if (gameState !== 'PLAYING') return;
        frameRef.current++;

        // Player movement
        const p = player.current;
        if (keys.current['ArrowLeft'] || keys.current['a']) p.x -= PLAYER_SPEED;
        if (keys.current['ArrowRight'] || keys.current['d']) p.x += PLAYER_SPEED;
        if (keys.current['ArrowUp'] || keys.current['w']) p.y -= PLAYER_SPEED;
        if (keys.current['ArrowDown'] || keys.current['s']) p.y += PLAYER_SPEED;
        p.x = Math.max(10, Math.min(ARENA_W - 10, p.x));
        p.y = Math.max(10, Math.min(ARENA_H - 10, p.y));

        // Auto-shoot
        if (keys.current[' '] || keys.current['mouse']) {
            shoot();
        }

        // Move bullets
        bullets.current = bullets.current.filter(b => {
            b.x += b.vx;
            b.y += b.vy;
            return b.x > -10 && b.x < ARENA_W + 10 && b.y > -10 && b.y < ARENA_H + 10;
        });

        // Move enemies
        enemies.current = enemies.current.filter(e => {
            e.x += e.vx;
            e.y += e.vy;
            // If enemy reaches player zone
            const dx = e.x - p.x;
            const dy = e.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 20) {
                hpRef.current--;
                setHp(hpRef.current);
                addParticles(e.x, e.y, '#EF4444');
                if (hpRef.current <= 0) {
                    playSound('dead');
                    setScore(scoreRef.current);
                    setGameState('GAME_OVER');
                }
                return false;
            }
            // Off screen check (way off)
            if (e.y > ARENA_H + 50 || e.x < -50 || e.x > ARENA_W + 50) return false;
            return true;
        });

        // Bullet-enemy collision
        for (let bi = bullets.current.length - 1; bi >= 0; bi--) {
            const b = bullets.current[bi];
            for (let ei = enemies.current.length - 1; ei >= 0; ei--) {
                const e = enemies.current[ei];
                const dx = b.x - e.x;
                const dy = b.y - e.y;
                if (Math.sqrt(dx * dx + dy * dy) < e.size) {
                    e.hp--;
                    bullets.current.splice(bi, 1);
                    if (e.hp <= 0) {
                        addParticles(e.x, e.y, e.color);
                        enemies.current.splice(ei, 1);
                        scoreRef.current += 10;
                        playSound('hit');
                    }
                    break;
                }
            }
        }

        // Update particles
        particles.current = particles.current.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            return p.life > 0;
        });

        // Spawn waves
        const spawnRate = Math.max(20, 60 - waveRef.current * 5);
        if (frameRef.current % spawnRate === 0) {
            const count = 1 + Math.floor(waveRef.current / 3);
            for (let i = 0; i < count; i++) spawnEnemy();
        }

        // Wave progression
        if (frameRef.current % 600 === 0 && frameRef.current > 0) {
            waveRef.current++;
            setWave(waveRef.current);
        }

        setRenderTick(t => t + 1);
        animRef.current = requestAnimationFrame(gameLoop);
    }, [gameState]);

    useEffect(() => {
        if (gameState === 'PLAYING') {
            animRef.current = requestAnimationFrame(gameLoop);
        }
        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, [gameState, gameLoop]);

    // Keyboard
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        const onDown = (e) => {
            keys.current[e.key] = true;
            if (e.key === ' ') e.preventDefault();
        };
        const onUp = (e) => {
            keys.current[e.key] = false;
        };
        window.addEventListener('keydown', onDown);
        window.addEventListener('keyup', onUp);
        return () => {
            window.removeEventListener('keydown', onDown);
            window.removeEventListener('keyup', onUp);
        };
    }, []);

    // Mouse aim + shoot
    useEffect(() => {
        if (Platform.OS !== 'web' || gameState !== 'PLAYING') return;
        const onMove = (e) => {
            if (!arenaRef.current) return;
            const rect = arenaRef.current.getBoundingClientRect
                ? arenaRef.current.getBoundingClientRect()
                : null;
            if (!rect) return;
            const mx = (e.clientX - rect.left) / scaleFactor;
            const my = (e.clientY - rect.top) / scaleFactor;
            const dx = mx - player.current.x;
            const dy = my - player.current.y;
            aimAngle.current = Math.atan2(dy, dx);
        };
        const onMouseDown = () => { keys.current['mouse'] = true; };
        const onMouseUp = () => { keys.current['mouse'] = false; };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [gameState, scaleFactor]);

    const handleStart = () => {
        initGame();
        setGameState('PLAYING');
    };

    // Render helpers
    const renderEnemy = (e, i) => {
        if (e.type === 'triangle') {
            return (
                <View key={`e-${i}`} style={{
                    position: 'absolute', left: e.x - e.size / 2, top: e.y - e.size / 2,
                    width: 0, height: 0,
                    borderLeftWidth: e.size / 2, borderRightWidth: e.size / 2,
                    borderBottomWidth: e.size,
                    borderLeftColor: 'transparent', borderRightColor: 'transparent',
                    borderBottomColor: e.color,
                }} />
            );
        }
        if (e.type === 'diamond') {
            return (
                <View key={`e-${i}`} style={{
                    position: 'absolute', left: e.x - e.size / 2, top: e.y - e.size / 2,
                    width: e.size, height: e.size,
                    backgroundColor: e.color,
                    transform: [{ rotate: '45deg' }],
                    borderRadius: 2,
                }} />
            );
        }
        return (
            <View key={`e-${i}`} style={{
                position: 'absolute', left: e.x - e.size / 2, top: e.y - e.size / 2,
                width: e.size, height: e.size,
                backgroundColor: e.color,
                borderRadius: e.size / 2,
            }} />
        );
    };

    const p = player.current;
    const gunAngle = (aimAngle.current * 180) / Math.PI;

    return (
        <View style={[styles.container, { width: ARENA_W * scaleFactor }]}>
            <View style={[styles.wrapper, { transform: [{ scale: scaleFactor }] }]}>
                {/* HUD Header */}
                <View style={styles.hud}>
                    <Text style={styles.hudTitle}>SPACE DEFENSE</Text>
                    <View style={styles.hudStats}>
                        <Text style={styles.hudText}>WAVE {gameState === 'PLAYING' ? waveRef.current : wave}</Text>
                        <Text style={styles.hudSep}>|</Text>
                        <Text style={styles.hudText}>SCORE {String(gameState === 'PLAYING' ? scoreRef.current : score).padStart(5, '0')}</Text>
                        <Text style={styles.hudSep}>|</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Text key={i} style={{ fontSize: 12, marginRight: 1, opacity: i < (gameState === 'PLAYING' ? hpRef.current : hp) ? 1 : 0.2 }}>❤️</Text>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Arena */}
                <View
                    ref={ref => {
                        if (Platform.OS === 'web' && ref) {
                            arenaRef.current = ref;
                        }
                    }}
                    style={styles.arena}
                >
                    {/* Grid lines for atmosphere */}
                    {Array.from({ length: 20 }).map((_, i) => (
                        <View key={`gl-${i}`} style={{
                            position: 'absolute', left: 0, right: 0,
                            top: i * (ARENA_H / 20),
                            height: 1, backgroundColor: 'rgba(79, 163, 154, 0.06)',
                        }} />
                    ))}
                    {Array.from({ length: 28 }).map((_, i) => (
                        <View key={`gv-${i}`} style={{
                            position: 'absolute', top: 0, bottom: 0,
                            left: i * (ARENA_W / 28),
                            width: 1, backgroundColor: 'rgba(79, 163, 154, 0.06)',
                        }} />
                    ))}

                    {/* Particles */}
                    {particles.current.map((pt, i) => (
                        <View key={`p-${i}`} style={{
                            position: 'absolute',
                            left: pt.x - pt.size / 2, top: pt.y - pt.size / 2,
                            width: pt.size, height: pt.size,
                            backgroundColor: pt.color,
                            borderRadius: pt.size / 2,
                            opacity: pt.life / 30,
                        }} />
                    ))}

                    {/* Bullets */}
                    {bullets.current.map((b, i) => (
                        <View key={`b-${i}`} style={{
                            position: 'absolute',
                            left: b.x - 2, top: b.y - 2,
                            width: 4, height: 4,
                            backgroundColor: '#FBBF24',
                            borderRadius: 2,
                            shadowColor: '#FBBF24',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.8,
                            shadowRadius: 4,
                        }} />
                    ))}

                    {/* Enemies */}
                    {enemies.current.map(renderEnemy)}

                    {/* Player */}
                    {gameState === 'PLAYING' && (
                        <View style={{
                            position: 'absolute',
                            left: p.x - PLAYER_SIZE / 2, top: p.y - PLAYER_SIZE / 2,
                        }}>
                            {/* Gun barrel */}
                            <View style={{
                                position: 'absolute',
                                left: PLAYER_SIZE / 2 - 2, top: PLAYER_SIZE / 2 - 1,
                                width: 16, height: 3,
                                backgroundColor: '#94A3B8',
                                borderRadius: 1,
                                transformOrigin: '2px 1.5px',
                                transform: [{ rotate: `${gunAngle}deg` }],
                            }} />
                            {/* Body */}
                            <View style={{
                                width: PLAYER_SIZE, height: PLAYER_SIZE,
                                backgroundColor: '#4FA39A',
                                borderRadius: PLAYER_SIZE / 2,
                                borderWidth: 2,
                                borderColor: '#2DD4BF',
                            }} />
                        </View>
                    )}

                    {/* Start Overlay */}
                    {gameState === 'START' && (
                        <View style={styles.overlay}>
                            <Text style={{ fontSize: 36, marginBottom: 8 }}>🎯</Text>
                            <Text style={styles.overlayTitle}>SPACE DEFENSE</Text>
                            <Text style={styles.overlaySubtitle}>
                                WASD to move • Mouse to aim • Click/Space to shoot
                            </Text>
                            <TouchableOpacity style={styles.playBtn} onPress={handleStart}>
                                <Text style={styles.playBtnText}>START MISSION</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Game Over Overlay */}
                    {gameState === 'GAME_OVER' && (
                        <View style={styles.overlay}>
                            <Text style={styles.gameOverText}>MISSION FAILED</Text>
                            <Text style={styles.finalScore}>Score: {score} • Wave: {wave}</Text>
                            <TouchableOpacity style={styles.playBtn} onPress={handleStart}>
                                <Text style={styles.playBtnText}>RETRY</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Mobile Controls */}
                <View style={styles.mobileControls}>
                    <View style={styles.dpad}>
                        <TouchableOpacity
                            style={styles.dpadBtn}
                            onPressIn={() => { keys.current['w'] = true; }}
                            onPressOut={() => { keys.current['w'] = false; }}
                        >
                            <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                        <View style={styles.dpadRow}>
                            <TouchableOpacity
                                style={styles.dpadBtn}
                                onPressIn={() => { keys.current['a'] = true; }}
                                onPressOut={() => { keys.current['a'] = false; }}
                            >
                                <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
                            </TouchableOpacity>
                            <View style={styles.dpadCenter} />
                            <TouchableOpacity
                                style={styles.dpadBtn}
                                onPressIn={() => { keys.current['d'] = true; }}
                                onPressOut={() => { keys.current['d'] = false; }}
                            >
                                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            style={styles.dpadBtn}
                            onPressIn={() => { keys.current['s'] = true; }}
                            onPressOut={() => { keys.current['s'] = false; }}
                        >
                            <Ionicons name="arrow-down" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        style={styles.fireBtn}
                        onPressIn={() => { keys.current[' '] = true; }}
                        onPressOut={() => { keys.current[' '] = false; }}
                    >
                        <Text style={styles.fireBtnText}>FIRE</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignSelf: 'center',
        overflow: 'hidden',
        borderRadius: 16,
    },
    wrapper: {
        width: ARENA_W,
        backgroundColor: '#0F1A18',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#1E2E2B',
        transformOrigin: 'top left',
    },
    hud: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        paddingHorizontal: 16,
        backgroundColor: '#0A1210',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(79, 163, 154, 0.15)',
    },
    hudTitle: {
        fontFamily: FONTS.bold,
        fontSize: 14,
        color: '#4FA39A',
        letterSpacing: 2,
    },
    hudStats: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    hudText: {
        fontFamily: 'monospace',
        fontSize: 12,
        fontWeight: '700',
        color: '#A0B2AD',
        letterSpacing: 1,
    },
    hudSep: {
        color: 'rgba(79, 163, 154, 0.3)',
        marginHorizontal: 10,
    },
    arena: {
        width: ARENA_W,
        height: ARENA_H,
        backgroundColor: '#0F1A18',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'crosshair',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 26, 24, 0.9)',
    },
    overlayTitle: {
        fontFamily: FONTS.bold,
        fontSize: 28,
        color: '#4FA39A',
        letterSpacing: 3,
        marginBottom: 8,
    },
    overlaySubtitle: {
        fontSize: 12,
        color: '#A0B2AD',
        marginBottom: 24,
        letterSpacing: 0.5,
    },
    playBtn: {
        backgroundColor: '#4FA39A',
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 8,
    },
    playBtnText: {
        color: '#FFFFFF',
        fontFamily: FONTS.bold,
        fontSize: 14,
        letterSpacing: 2,
    },
    gameOverText: {
        fontFamily: FONTS.bold,
        fontSize: 28,
        color: '#EF4444',
        letterSpacing: 3,
        marginBottom: 8,
    },
    finalScore: {
        fontSize: 14,
        color: '#A0B2AD',
        marginBottom: 20,
    },
    mobileControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#0A1210',
        borderTopWidth: 1,
        borderTopColor: 'rgba(79, 163, 154, 0.15)',
    },
    dpad: {
        alignItems: 'center',
    },
    dpadRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dpadBtn: {
        width: 36,
        height: 36,
        backgroundColor: '#1E2E2B',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 2,
        borderWidth: 1,
        borderColor: 'rgba(79, 163, 154, 0.2)',
    },
    dpadCenter: {
        width: 36,
        height: 36,
        margin: 2,
    },
    fireBtn: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FCA5A5',
    },
    fireBtnText: {
        color: '#FFFFFF',
        fontFamily: FONTS.bold,
        fontSize: 13,
        letterSpacing: 1,
    },
});

export default ShooterGame;
