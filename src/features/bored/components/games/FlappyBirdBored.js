import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions, useWindowDimensions } from 'react-native';

const GRAVITY = 0.6;
const JUMP_STRENGTH = -9;
const PIPE_SPEED = 3;
const PIPE_WIDTH = 60;
const PIPE_GAP = 220;
const BIRD_SIZE = 40;
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 450;

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
            osc.frequency.setValueAtTime(300, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } else if (type === 'score') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.05);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.1);
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
        }
    } catch (e) {
        // Ignore audio errors silently
    }
};

const FlappyBirdBored = () => {
    const requestRef = useRef();
    const [gameState, setGameState] = useState('START'); 
    const [score, setScore] = useState(0);

    const bird = useRef({ y: 200, velocity: 0 });
    const pipes = useRef([]);
    const clouds = useRef([
        { x: 100, y: 50, speed: 0.5 },
        { x: 350, y: 100, speed: 0.3 },
        { x: 550, y: 30, speed: 0.6 },
    ]);
    const frameCount = useRef(0);
    const scoreRef = useRef(0);

    const [renderTick, setRenderTick] = useState(0);

    const initGame = () => {
        bird.current = { y: 200, velocity: 0 };
        pipes.current = [];
        frameCount.current = 0;
        scoreRef.current = 0;
        setScore(0);
    };

    const jump = () => {
        if (gameState === 'START' || gameState === 'GAME_OVER') {
            initGame();
            setGameState('PLAYING');
        }
        bird.current.velocity = JUMP_STRENGTH;
        playSound('jump');
    };

    const updateGame = () => {
        if (gameState !== 'PLAYING') return;

        // Apply gravity
        bird.current.velocity += GRAVITY;
        bird.current.y += bird.current.velocity;

        // Move clouds
        clouds.current.forEach(c => {
            c.x -= c.speed;
            if (c.x < -100) {
                c.x = CANVAS_WIDTH + 50;
                c.y = 20 + Math.random() * 100;
            }
        });

        // Spawn pipes
        if (frameCount.current % 100 === 0) {
            const minHeight = 50;
            const maxHeight = CANVAS_HEIGHT - PIPE_GAP - 50;
            const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;

            pipes.current.push({
                x: CANVAS_WIDTH,
                topHeight,
                passed: false
            });
        }

        let collision = false;
        const currentSpeed = PIPE_SPEED + (scoreRef.current / 20); // gets slightly faster over time

        // Move pipes and check collisions
        for (let i = 0; i < pipes.current.length; i++) {
            let p = pipes.current[i];
            p.x -= currentSpeed;

            // Score point
            if (!p.passed && p.x + PIPE_WIDTH < 80) { // Bird is fixed at x=80
                p.passed = true;
                scoreRef.current += 1;
                playSound('score');
            }

            // Collision detection
            const bx = 80 + 5; // hitbox padding
            const by = bird.current.y + 5;
            const bw = BIRD_SIZE - 10;
            const bh = BIRD_SIZE - 10;

            const checkRectCollision = (rectX, rectY, rectW, rectH) => {
                return (bx < rectX + rectW && bx + bw > rectX && by < rectY + rectH && by + bh > rectY);
            };

            // Top pipe
            if (checkRectCollision(p.x, 0, PIPE_WIDTH, p.topHeight)) collision = true;
            // Bottom pipe
            if (checkRectCollision(p.x, p.topHeight + PIPE_GAP, PIPE_WIDTH, CANVAS_HEIGHT - (p.topHeight + PIPE_GAP))) collision = true;
        }

        // Remove off-screen pipes
        if (pipes.current.length > 0 && pipes.current[0].x + PIPE_WIDTH < 0) {
            pipes.current.shift();
        }

        // Floor/Ceiling collision
        if (bird.current.y + BIRD_SIZE >= CANVAS_HEIGHT || bird.current.y <= 0) {
            collision = true;
        }

        if (collision) {
            playSound('crash');
            setScore(scoreRef.current);
            setGameState('GAME_OVER');
        }

        frameCount.current += 1;
        setRenderTick(t => t + 1); // trigger re-render
    };

    const gameLoop = () => {
        updateGame();
        requestRef.current = requestAnimationFrame(gameLoop);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(requestRef.current);
    }, [gameState]);

    const { width: windowWidth } = useWindowDimensions();
    // Calculate scale so the 600px canvas fits exactly inside the window (minus padding)
    const containerWidth = Math.min(windowWidth - 40, CANVAS_WIDTH);
    const scaleFactor = containerWidth / CANVAS_WIDTH;

    const displayScore = gameState === 'PLAYING' ? scoreRef.current : score;

    return (
        <View style={[styles.container, { 
            width: CANVAS_WIDTH * scaleFactor, 
            height: (CANVAS_HEIGHT + 60) * scaleFactor // +60 for header
        }]}>
            <View style={[styles.scaleWrapper, { transform: [{ scale: scaleFactor }] }]}>
                <View style={styles.header}>
                    <Text style={styles.title}>Flappy Bird (Premium)</Text>
                    <Text style={styles.scoreText}>SCORE: {displayScore}</Text>
                </View>

                <TouchableOpacity activeOpacity={1} onPress={jump} style={styles.gameArea}>
                {/* Sky and Clouds */}
                {clouds.current.map((c, i) => (
                    <View key={`cloud-${i}`} style={[styles.cloud, { left: c.x, top: c.y }]}>
                        <Text style={{ fontSize: 40, opacity: 0.9 }}>☁️</Text>
                    </View>
                ))}

                {/* Pipes */}
                {pipes.current.map((p, i) => (
                    <React.Fragment key={i}>
                        {/* Top Pipe */}
                        <View style={[styles.pipe, { left: p.x, top: 0, height: p.topHeight }]}>
                            <View style={[styles.pipeCap, { bottom: -20 }]} />
                        </View>
                        {/* Bottom Pipe */}
                        <View style={[styles.pipe, { left: p.x, top: p.topHeight + PIPE_GAP, height: CANVAS_HEIGHT - (p.topHeight + PIPE_GAP) }]}>
                            <View style={[styles.pipeCap, { top: -20 }]} />
                        </View>
                    </React.Fragment>
                ))}

                {/* Bird */}
                <View style={[styles.bird, { top: bird.current.y }]}>
                    <Text style={{ fontSize: BIRD_SIZE, transform: [{ scaleX: -1 }] }}>🐦</Text>
                </View>

                {/* Overlays */}
                {gameState === 'START' && (
                    <View style={styles.overlay}>
                        <Text style={styles.overlayTitle}>Tap to Fly</Text>
                    </View>
                )}

                {gameState === 'GAME_OVER' && (
                    <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                        <Text style={[styles.overlayTitle, { color: '#ff5252', fontSize: 32 }]}>CRASHED!</Text>
                        <Text style={styles.overlaySubtitle}>Tap screen to try again</Text>
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
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        transformOrigin: 'top left', // Ensure it scales from top-left so it stays positioned
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        padding: 16,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    scoreText: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1E293B',
    },
    gameArea: {
        height: CANVAS_HEIGHT,
        backgroundColor: '#87CEEB', // Sky blue
        position: 'relative',
        overflow: 'hidden',
    },
    cloud: {
        position: 'absolute',
    },
    bird: {
        position: 'absolute',
        left: 80,
        width: BIRD_SIZE,
        height: BIRD_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pipe: {
        position: 'absolute',
        width: PIPE_WIDTH,
        backgroundColor: '#73BF2E', // Classic green
        borderWidth: 3,
        borderColor: '#548C22',
        borderRightWidth: 4,
        borderBottomWidth: 0,
        borderTopWidth: 0,
    },
    pipeCap: {
        position: 'absolute',
        left: -4,
        width: PIPE_WIDTH + 8,
        height: 20,
        backgroundColor: '#73BF2E',
        borderWidth: 3,
        borderColor: '#548C22',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: '#1E293B',
        marginBottom: 8,
        letterSpacing: 1,
    },
    overlaySubtitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#F8FAFC',
    }
});

export default FlappyBirdBored;
