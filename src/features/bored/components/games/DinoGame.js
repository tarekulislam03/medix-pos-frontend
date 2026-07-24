import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions, useWindowDimensions } from 'react-native';
import { COLORS, FONTS } from '../../../../core/constants/theme';

const GRAVITY = 0.8;
const JUMP_STRENGTH = -13;
const GAME_SPEED = 7;
const DINO_SIZE = 40;
const CACTUS_WIDTH = 25;
const CACTUS_HEIGHT = 50;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 200;
const GROUND_Y = 160;

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

        if (type === 'jump') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } else if (type === 'crash') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } else if (type === 'score') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        }
    } catch (e) {
        // ignore
    }
};

const DinoGame = () => {
    const requestRef = useRef();
    const [gameState, setGameState] = useState('START');
    const [score, setScore] = useState(0);

    const dino = useRef({ y: GROUND_Y, velocity: 0, isJumping: false });
    const obstacles = useRef([]);
    const clouds = useRef([
        { x: 200, y: 30, speed: 0.5 },
        { x: 500, y: 50, speed: 0.8 },
        { x: 800, y: 20, speed: 0.4 }
    ]);
    const frameCount = useRef(0);
    const scoreRef = useRef(0);

    const [renderTick, setRenderTick] = useState(0);

    const initGame = () => {
        dino.current = { y: GROUND_Y, velocity: 0, isJumping: false };
        obstacles.current = [];
        frameCount.current = 0;
        scoreRef.current = 0;
        setScore(0);
    };

    const jump = () => {
        if (gameState === 'START' || gameState === 'GAME_OVER') {
            initGame();
            setGameState('PLAYING');
            return;
        }
        
        if (!dino.current.isJumping && dino.current.y >= GROUND_Y) {
            dino.current.velocity = JUMP_STRENGTH;
            dino.current.isJumping = true;
            playSound('jump');
        }
    };

    const updateGame = () => {
        if (gameState !== 'PLAYING') return;

        // Apply physics
        dino.current.velocity += GRAVITY;
        dino.current.y += dino.current.velocity;

        // Ground collision
        if (dino.current.y >= GROUND_Y) {
            dino.current.y = GROUND_Y;
            dino.current.velocity = 0;
            dino.current.isJumping = false;
        }

        // Move clouds
        clouds.current.forEach(c => {
            c.x -= c.speed;
            if (c.x < -60) {
                c.x = CANVAS_WIDTH + 60;
                c.y = 20 + Math.random() * 50;
            }
        });

        // Spawn obstacles
        if (frameCount.current > 0 && Math.random() < 0.02 && frameCount.current % 40 === 0) {
           if (obstacles.current.length === 0 || (CANVAS_WIDTH - obstacles.current[obstacles.current.length - 1].x) > 250) {
                obstacles.current.push({
                    x: CANVAS_WIDTH,
                    y: GROUND_Y + DINO_SIZE - CACTUS_HEIGHT,
                    width: CACTUS_WIDTH,
                    height: CACTUS_HEIGHT
                });
           }
        } else if (obstacles.current.length === 0 && frameCount.current > 60) {
             obstacles.current.push({
                x: CANVAS_WIDTH,
                y: GROUND_Y + DINO_SIZE - CACTUS_HEIGHT,
                width: CACTUS_WIDTH,
                height: CACTUS_HEIGHT
            });
        }

        let collision = false;
        const currentSpeed = GAME_SPEED + (scoreRef.current / 500);

        // Move obstacles and check collisions
        for (let i = 0; i < obstacles.current.length; i++) {
            let obs = obstacles.current[i];
            obs.x -= currentSpeed;

            // Hitbox
            const bx = 80; // Dino X
            const by = dino.current.y;
            const bw = DINO_SIZE - 12;
            const bh = DINO_SIZE - 8;
            
            const ox = obs.x;
            const oy = obs.y;
            const ow = obs.width;
            const oh = obs.height;

            if (bx < ox + ow && bx + bw > ox && by < oy + oh && by + bh > oy) {
                collision = true;
            }
        }

        // Score
        frameCount.current += 1;
        if (frameCount.current % 5 === 0) {
            scoreRef.current += 1;
            if (scoreRef.current > 0 && scoreRef.current % 100 === 0) {
                playSound('score');
            }
        }

        // Cleanup
        if (obstacles.current.length > 0 && obstacles.current[0].x + CACTUS_WIDTH < 0) {
            obstacles.current.shift();
        }

        if (collision) {
            playSound('crash');
            setScore(scoreRef.current);
            setGameState('GAME_OVER');
        }

        setRenderTick(t => t + 1);
    };

    const gameLoop = () => {
        updateGame();
        requestRef.current = requestAnimationFrame(gameLoop);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(requestRef.current);
    }, [gameState]);

    const formattedScore = String(gameState === 'PLAYING' ? scoreRef.current : Math.max(score, scoreRef.current)).padStart(5, '0');

    // Make the component responsive to screen width
    const { width: windowWidth } = useWindowDimensions();
    const containerWidth = Math.min(CANVAS_WIDTH, windowWidth - 40);
    const scaleFactor = containerWidth / CANVAS_WIDTH;

    // Calculate running animation angle (waddle)
    const dinoRotation = (dino.current.y >= GROUND_Y && gameState === 'PLAYING')
        ? Math.sin(frameCount.current / 3) * 15 // degrees
        : 0;

    return (
        <View style={[styles.container, { 
            width: CANVAS_WIDTH * scaleFactor,
            height: (CANVAS_HEIGHT + 60) * scaleFactor // +60 for header
        }]}>
            <View style={[styles.scaleWrapper, { transform: [{ scale: scaleFactor }] }]}>
                <View style={styles.header}>
                    <Text style={styles.title}>Dino Run (Widescreen)</Text>
                    <Text style={styles.scoreText}>HI  00000   {formattedScore}</Text>
                </View>

                <TouchableOpacity activeOpacity={1} onPress={jump} style={styles.gameArea}>
                {/* Background Layer: Clouds */}
                {clouds.current.map((c, i) => (
                    <View key={`cloud-${i}`} style={[styles.cloud, { left: c.x, top: c.y }]}>
                        <Text style={{ fontSize: 32, opacity: 0.8 }}>☁️</Text>
                    </View>
                ))}

                {/* Ground Layer */}
                <View style={styles.groundLine} />
                <View style={styles.groundFill} />

                {/* Obstacles Layer */}
                {obstacles.current.map((obs, i) => (
                    <View key={i} style={[styles.cactusContainer, { left: obs.x, top: obs.y }]}>
                        <Text style={{ fontSize: 32 }}>🌵</Text>
                    </View>
                ))}

                {/* Entity Layer */}
                <View style={[styles.dino, { top: dino.current.y, left: 80, transform: [{ rotate: `${dinoRotation}deg` }] }]}>
                    <Text style={{ fontSize: DINO_SIZE, transform: [{ scaleX: -1 }] }}>🦖</Text>
                </View>

                {/* Overlays */}
                {gameState === 'START' && (
                    <View style={styles.overlay}>
                        <Text style={styles.overlayTitle}>Tap to play</Text>
                    </View>
                )}

                {gameState === 'GAME_OVER' && (
                    <View style={styles.overlay}>
                        <Text style={styles.gameOverText}>G A M E   O V E R</Text>
                        <View style={styles.restartIcon}>
                            <Text style={{ fontSize: 28 }}>🔄</Text>
                        </View>
                    </View>
                )}
            </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        alignSelf: 'center',
        borderRadius: 16,
    },
    scaleWrapper: {
        width: CANVAS_WIDTH,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        transformOrigin: 'top left', // Scale from top-left
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        paddingBottom: 0,
    },
    title: {
        fontFamily: FONTS.bold,
        fontSize: 16,
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    scoreText: {
        fontSize: 18,
        fontFamily: 'monospace', // Monospace is good for scores, but let's keep it bold
        fontWeight: 'bold',
        color: '#475569',
        letterSpacing: 2,
    },
    gameArea: {
        height: CANVAS_HEIGHT,
        position: 'relative',
        overflow: 'hidden',
    },
    cloud: {
        position: 'absolute',
    },
    groundLine: {
        position: 'absolute',
        top: GROUND_Y + DINO_SIZE - 2, // fine tune for visuals
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: '#94A3B8',
    },
    groundFill: {
        position: 'absolute',
        top: GROUND_Y + DINO_SIZE,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#F1F5F9', // slightly darker ground
    },
    dino: {
        position: 'absolute',
        width: DINO_SIZE,
        height: DINO_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cactusContainer: {
        position: 'absolute',
        width: CACTUS_WIDTH,
        height: CACTUS_HEIGHT,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(248, 250, 252, 0.7)',
    },
    overlayTitle: {
        fontFamily: FONTS.bold,
        fontSize: 24,
        color: '#334155',
        letterSpacing: 1.5,
    },
    gameOverText: {
        fontFamily: FONTS.bold,
        fontSize: 28,
        color: '#334155',
        letterSpacing: 3,
        marginBottom: 10,
    },
    restartIcon: {
        marginTop: 10,
        opacity: 0.8,
    }
});

export default DinoGame;
