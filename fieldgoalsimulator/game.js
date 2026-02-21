// Field Goal Simulator - Main Game Logic
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new Renderer(this.canvas);

        // Meters
        this.powerMeter = new Meter('power', 30, 200, 30, 200);
        this.accuracyMeter = new Meter('accuracy', 250, 520, 300, 30);

        // Game state
        this.state = 'READY'; // READY, POWER, ACCURACY, KICKING, RESULT
        this.distance = 20;
        this.score = 0;
        this.streak = 0;
        this.makes = 0;
        this.attempts = 0;

        // Ball animation
        this.ball = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 80,
            startX: this.canvas.width / 2,
            startY: this.canvas.height - 80,
            scale: 1,
            rotation: 0,
            time: 0,
            power: 0,
            accuracy: 0,
            isFlying: false
        };

        // Result display
        this.resultMessage = '';
        this.resultColor = '#ffd700';
        this.resultTimer = 0;

        // Snap timer for blocking mechanic
        this.snapTimer = 0;
        this.snapTimeLimit = 1500; // 1.5 seconds to kick before blocked
        this.rushProgress = 0; // 0 to 1, how far defenders have rushed
        this.isBlocked = false;

        // Wind settings
        this.windMode = 'none'; // 'none', 'light', 'heavy'
        this.windSpeed = 0; // Current wind speed in mph
        this.windDirection = 1; // 1 = right, -1 = left

        // Voice announcer
        this.synth = window.speechSynthesis;

        // Bind event handlers
        this.canvas.addEventListener('click', this.handleInput.bind(this));
        document.addEventListener('keydown', this.handleKeydown.bind(this));

        // Distance selector buttons
        this.distanceButtons = document.querySelectorAll('.distance-btn');
        this.distanceButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const newDistance = parseInt(btn.dataset.distance);
                this.setDistance(newDistance);
            });
        });

        // Wind selector buttons
        this.windButtons = document.querySelectorAll('.wind-btn');
        this.windButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const windMode = btn.dataset.wind;
                this.setWind(windMode);
            });
        });

        // Initialize ball position based on distance
        this.resetForNextKick();

        // Start game loop
        this.lastTime = 0;
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    getSpeedForDistance(meterType) {
        // Meter speed increases with distance
        const baseSpeed = 0.025;
        const distanceMultiplier = 1 + (this.distance - 20) / 50;
        let speed = baseSpeed * distanceMultiplier;

        // Power bar is 10% slower, accuracy bar is 50% slower
        if (meterType === 'power') {
            speed *= 0.9;
        } else if (meterType === 'accuracy') {
            speed *= 0.54;
        }

        return speed;
    }

    // Calculate the Y position for the line of scrimmage based on kick distance
    // Longer kicks = further from goal = higher Y value (lower on screen)
    getLineOfScrimmageY() {
        // Goal post is at horizonY (~240). End zone starts there.
        // 20 yard kick: ball is closer to goal (around Y = 420)
        // 60 yard kick: ball is further back (around Y = 560)
        const minY = 380;  // Closest position (20 yards)
        const maxY = 540;  // Furthest position (60 yards)
        const distanceRange = 60 - 20; // 40 yards of range
        const distanceRatio = (this.distance - 20) / distanceRange;
        return minY + (maxY - minY) * distanceRatio;
    }

    // Get the scale for players/ball based on distance (perspective)
    getDistanceScale() {
        // Further back = smaller (perspective effect)
        const minScale = 0.6;  // At 60 yards
        const maxScale = 1.0;  // At 20 yards
        const distanceRatio = (this.distance - 20) / 40;
        return maxScale - (maxScale - minScale) * distanceRatio;
    }

    // Get kicker's Y position (behind the line of scrimmage)
    getKickerY() {
        const scale = this.getDistanceScale();
        return this.getLineOfScrimmageY() + 70 * scale; // Kicker stands back
    }

    // Get ball Y position (right at the kicker's feet)
    getBallY() {
        const scale = this.getDistanceScale();
        return this.getKickerY() - 5 * scale; // Ball is right at kicker's feet
    }

    // Voice announcer function
    speak(text) {
        if (this.synth) {
            this.synth.cancel(); // Cancel any ongoing speech
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            this.synth.speak(utterance);
        }
    }

    handleKeydown(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            this.handleInput();
        }

        // Number keys 1-5 for distance selection
        const distanceMap = {
            'Digit1': 20, 'Numpad1': 20,
            'Digit2': 30, 'Numpad2': 30,
            'Digit3': 40, 'Numpad3': 40,
            'Digit4': 50, 'Numpad4': 50,
            'Digit5': 60, 'Numpad5': 60
        };

        if (distanceMap[e.code]) {
            this.setDistance(distanceMap[e.code]);
        }
    }

    setDistance(newDistance) {
        // Only allow distance change when not mid-kick
        if (this.state === 'KICKING') return;

        this.distance = newDistance;
        this.updateStats();

        // Update button active states
        this.distanceButtons.forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.distance) === newDistance);
        });

        // Always update ball position when distance changes
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.getBallY();
        this.ball.scale = this.getDistanceScale();

        // Reset meters if in middle of meter sequence
        if (this.state !== 'READY' && this.state !== 'RESULT') {
            this.resetForNextKick();
        }
    }

    setWind(mode) {
        this.windMode = mode;

        // Update button active states
        this.windButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.wind === mode);
        });

        // Generate wind based on mode
        this.generateWind();
    }

    generateWind() {
        const windDisplay = document.getElementById('windDisplay');

        if (this.windMode === 'none') {
            this.windSpeed = 0;
            this.windDirection = 0;
            windDisplay.textContent = 'No Wind';
        } else if (this.windMode === 'light') {
            // 5-12 mph
            this.windSpeed = 5 + Math.random() * 7;
            this.windDirection = Math.random() < 0.5 ? -1 : 1;
            const dirText = this.windDirection === 1 ? '→' : '←';
            windDisplay.textContent = `${Math.round(this.windSpeed)} mph ${dirText}`;
        } else if (this.windMode === 'heavy') {
            // 15-25 mph
            this.windSpeed = 15 + Math.random() * 10;
            this.windDirection = Math.random() < 0.5 ? -1 : 1;
            const dirText = this.windDirection === 1 ? '→' : '←';
            windDisplay.textContent = `${Math.round(this.windSpeed)} mph ${dirText}`;
        }
    }

    handleInput() {
        switch (this.state) {
            case 'READY':
                this.state = 'POWER';
                this.powerMeter.start(this.getSpeedForDistance('power'));
                this.speak("If they make, they win!");
                break;

            case 'POWER':
                this.ball.power = this.powerMeter.stop();
                this.state = 'ACCURACY';
                this.accuracyMeter.start(this.getSpeedForDistance('accuracy'));
                // Start the snap timer - defenders are rushing!
                this.snapTimer = this.snapTimeLimit;
                this.rushProgress = 0;
                break;

            case 'ACCURACY':
                this.ball.accuracy = this.accuracyMeter.stop();
                this.startKick();
                break;

            case 'RESULT':
                this.resetForNextKick();
                break;
        }
    }

    startKick() {
        this.state = 'KICKING';
        this.ball.isFlying = true;
        this.ball.time = 0;
        this.ball.startX = this.canvas.width / 2;
        this.ball.startY = this.getBallY(); // 4 feet in front of kicker
        this.ball.startScale = this.getDistanceScale();
        this.attempts++;
        this.updateStats();

        // Generate new wind for this kick
        this.generateWind();
    }

    updateBall(deltaTime) {
        if (!this.ball.isFlying) return;

        this.ball.time += deltaTime * 0.002;

        // Calculate trajectory based on power and accuracy
        const power = this.ball.power;
        const accuracyDeviation = (this.ball.accuracy - 0.5) * 2; // -1 to 1

        // Flight duration - longer kicks take more time
        const distanceFactor = 1 + (this.distance - 20) / 60;
        const flightDuration = (0.8 + power * 0.4) * distanceFactor;

        if (this.ball.time >= flightDuration) {
            this.endKick();
            return;
        }

        const t = this.ball.time / flightDuration;

        // Parabolic arc for Y (up then down toward goal)
        // Higher arc for longer kicks
        const arcHeight = (150 + power * 100) * distanceFactor;
        const yOffset = -arcHeight * 4 * t * (1 - t);

        // Linear interpolation from start to goal area
        const startY = this.ball.startY;
        const endY = this.canvas.height * 0.38; // Near goal post crossbar
        this.ball.y = startY + (endY - startY) * t + yOffset;

        // Horizontal drift based on accuracy (more drift for longer kicks)
        const maxDrift = 80 + (this.distance - 20) * 1.5;
        const accuracyDrift = accuracyDeviation * maxDrift * t;

        // Wind drift - increases over time as ball is in the air longer
        // Wind effect scales with distance (longer kicks = more time in air = more wind effect)
        const windMultiplier = 3.5; // How strongly wind affects the ball
        const windEffect = this.windSpeed * this.windDirection * t * t * (this.distance / 30) * windMultiplier;

        const totalDrift = accuracyDrift + windEffect;
        this.ball.x = this.ball.startX + totalDrift;

        // Scale decreases as ball goes toward goal (perspective)
        // Start from distance-based scale, shrink to small near goal
        const endScale = 0.35;
        this.ball.scale = this.ball.startScale + (endScale - this.ball.startScale) * t;

        // Rotation
        this.ball.rotation += deltaTime * 0.01;
    }

    endKick() {
        this.ball.isFlying = false;

        // Determine if kick is good
        const isGood = this.checkIfGood();

        if (isGood) {
            this.score += this.getPointsForDistance();
            this.streak++;
            this.makes++;
            this.resultMessage = 'GOOD!';
            this.resultColor = '#4ade80';
            this.speak("It's good!");
        } else {
            this.streak = 0;
            this.resultMessage = this.getMissMessage();
            this.resultColor = '#ef4444';
            this.speak("No good.");
        }

        this.state = 'RESULT';
        this.resultTimer = 2000; // Show result for 2 seconds
        this.updateStats();
    }

    checkIfGood() {
        const power = this.ball.power;

        // Need enough power to reach the goal
        const minPower = 0.4 + (this.distance - 20) * 0.005;
        if (power < minPower) return false;

        // Check if ball is between the uprights based on actual position
        // Goal post is 120 pixels wide, centered on canvas
        const centerX = this.canvas.width / 2;
        const postWidth = 120;
        const leftUpright = centerX - postWidth / 2;
        const rightUpright = centerX + postWidth / 2;

        // Ball must be between the uprights
        return this.ball.x > leftUpright && this.ball.x < rightUpright;
    }

    getMissMessage() {
        const power = this.ball.power;
        const minPower = 0.4 + (this.distance - 20) * 0.005;

        if (power < minPower) {
            return 'NO GOOD! (Short)';
        }

        // Check actual ball position for wide left/right
        const centerX = this.canvas.width / 2;
        const postWidth = 120;
        const leftUpright = centerX - postWidth / 2;
        const rightUpright = centerX + postWidth / 2;

        if (this.ball.x <= leftUpright) {
            return 'NO GOOD! (Wide Left)';
        }

        if (this.ball.x >= rightUpright) {
            return 'NO GOOD! (Wide Right)';
        }

        return 'NO GOOD!';
    }

    getPointsForDistance() {
        // More points for longer kicks
        return Math.floor(this.distance / 10);
    }

    resetForNextKick() {
        this.state = 'READY';
        this.powerMeter.reset();
        this.accuracyMeter.reset();
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.getBallY(); // 4 feet in front of kicker
        this.ball.scale = this.getDistanceScale();
        this.ball.rotation = 0;
        this.resultMessage = '';
        this.snapTimer = 0;
        this.rushProgress = 0;
        this.isBlocked = false;
        this.updateStats();
    }

    updateStats() {
        document.getElementById('distance').textContent = `${this.distance} YDS`;
        document.getElementById('score').textContent = this.score;
        document.getElementById('streak').textContent = this.streak;
        document.getElementById('attempts').textContent = `${this.makes}/${this.attempts}`;
    }

    gameLoop(currentTime) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Update
        this.update(deltaTime);

        // Render
        this.render();

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    update(deltaTime) {
        // Update meters
        this.powerMeter.update();
        this.accuracyMeter.update();

        // Update ball
        this.updateBall(deltaTime);

        // Update snap timer during accuracy phase
        if (this.state === 'ACCURACY' && this.snapTimer > 0) {
            this.snapTimer -= deltaTime;
            this.rushProgress = 1 - (this.snapTimer / this.snapTimeLimit);

            // Check if time ran out - kick is blocked!
            if (this.snapTimer <= 0) {
                this.handleBlockedKick();
            }
        }

        // Update result timer
        if (this.resultTimer > 0) {
            this.resultTimer -= deltaTime;
            if (this.resultTimer <= 0 && this.state === 'RESULT') {
                // Auto-advance after showing result
                this.resetForNextKick();
            }
        }
    }

    handleBlockedKick() {
        this.isBlocked = true;
        this.accuracyMeter.stop();
        this.attempts++;
        this.streak = 0;
        this.resultMessage = 'BLOCKED!';
        this.resultColor = '#ef4444';
        this.state = 'RESULT';
        this.resultTimer = 2500;
        this.updateStats();
        this.speak("Blocked!");
    }

    render() {
        const renderer = this.renderer;

        renderer.clear();
        renderer.drawField(); // Includes goal post behind end zone

        // Line of scrimmage position based on kick distance
        const lineOfScrimmageY = this.getLineOfScrimmageY();
        const lineOfScrimmageX = this.canvas.width / 2;
        const playerScale = this.getDistanceScale();

        // Draw defensive line (rushing during accuracy phase)
        const showRush = this.state === 'ACCURACY' || (this.state === 'RESULT' && this.isBlocked);
        renderer.drawDefensiveLine(lineOfScrimmageY, showRush ? this.rushProgress : 0, playerScale);

        // Draw offensive line (stays in place, blocking)
        renderer.drawOffensiveLine(lineOfScrimmageY, playerScale);

        // Draw holder (next to the ball, in front of kicker)
        if (this.state !== 'KICKING' || this.ball.time < 0.1) {
            renderer.drawHolder(lineOfScrimmageX, this.getBallY(), playerScale);
        }

        // Draw kicker (ball is 4 feet in front of kicker)
        if (this.state !== 'KICKING' && this.state !== 'RESULT') {
            renderer.drawKicker(lineOfScrimmageX, this.getKickerY(), playerScale);
        }

        // Draw blocked kick animation at the line of scrimmage
        if (this.state === 'RESULT' && this.isBlocked) {
            renderer.drawBlockedKick(lineOfScrimmageX, lineOfScrimmageY, playerScale);
        }

        // Draw ball
        renderer.drawBall(this.ball.x, this.ball.y, this.ball.scale, this.ball.rotation);

        renderer.drawDistanceMarker(this.distance);

        // Draw meters based on state
        if (this.state === 'POWER' || this.state === 'ACCURACY' ||
            this.state === 'READY') {
            this.powerMeter.draw(renderer.ctx);
        }

        if (this.state === 'ACCURACY') {
            this.accuracyMeter.draw(renderer.ctx);
            // Draw snap timer
            renderer.drawTimer(this.snapTimer, this.snapTimeLimit);
        }

        // Draw locked meters during kick
        if (this.state === 'KICKING') {
            this.powerMeter.draw(renderer.ctx);
            this.accuracyMeter.draw(renderer.ctx);
        }

        // Draw instructions
        renderer.drawInstructions(this.state);

        // Draw result message
        if (this.resultMessage) {
            renderer.drawMessage(this.resultMessage, 'Press SPACE or click to continue', this.resultColor);
        }
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new Game();
});
