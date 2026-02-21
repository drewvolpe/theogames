// Renderer for Field Goal Simulator
class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    drawField() {
        const ctx = this.ctx;

        // Sky gradient
        const skyGradient = ctx.createLinearGradient(0, 0, 0, this.height * 0.4);
        skyGradient.addColorStop(0, '#1e3c72');
        skyGradient.addColorStop(1, '#2a5298');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, this.width, this.height * 0.4);

        // Draw stadium and fans behind end zone
        this.drawStadium();

        // Draw goal post BEHIND the end zone (before field is drawn)
        this.drawGoalPost();

        // Field gradient (perspective effect)
        const fieldGradient = ctx.createLinearGradient(0, this.height * 0.4, 0, this.height);
        fieldGradient.addColorStop(0, '#1a472a');
        fieldGradient.addColorStop(0.5, '#2d5a3f');
        fieldGradient.addColorStop(1, '#3d6b4f');
        ctx.fillStyle = fieldGradient;
        ctx.fillRect(0, this.height * 0.4, this.width, this.height * 0.6);

        // Draw yard lines with perspective
        this.drawYardLines();

        // Draw hash marks
        this.drawHashMarks();

        // Draw end zone
        this.drawEndZone();
    }

    drawStadium() {
        const ctx = this.ctx;
        const horizonY = this.height * 0.4;

        // Stadium structure (dark background)
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, this.width, horizonY - 20);

        // Stadium tiers
        const tierColors = ['#2a2a4a', '#252545', '#202040'];
        const tierHeights = [horizonY * 0.3, horizonY * 0.5, horizonY * 0.75];

        tierColors.forEach((color, i) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(0, tierHeights[i]);
            ctx.lineTo(this.width, tierHeights[i]);
            ctx.lineTo(this.width, tierHeights[i] + 40);
            ctx.lineTo(0, tierHeights[i] + 40);
            ctx.closePath();
            ctx.fill();
        });

        // Draw fans in the stands
        this.drawFans(horizonY);

        // Stadium lights
        this.drawStadiumLights();
    }

    drawFans(horizonY) {
        const ctx = this.ctx;
        const colors = ['#e74c3c', '#3498db', '#f39c12', '#9b59b6', '#1abc9c', '#e91e63', '#ff5722'];

        // Generate fans once and cache them
        if (!this.fansCache) {
            this.fansCache = [];
            for (let row = 0; row < 4; row++) {
                const y = horizonY * 0.25 + row * 25;
                const density = 40 + row * 5;
                const size = 4 + row * 1.5;

                for (let i = 0; i < density; i++) {
                    // Use deterministic pseudo-random based on position
                    const seed = row * 1000 + i;
                    const pseudoRandom1 = ((seed * 9301 + 49297) % 233280) / 233280;
                    const pseudoRandom2 = ((seed * 1234 + 56789) % 233280) / 233280;

                    this.fansCache.push({
                        x: (this.width / density) * i + pseudoRandom1 * 15,
                        y: y,
                        color: colors[Math.floor(pseudoRandom2 * colors.length)],
                        size: size
                    });
                }
            }
        }

        // Draw cached fans
        for (const fan of this.fansCache) {
            // Fan head
            ctx.fillStyle = '#ffd5b5';
            ctx.beginPath();
            ctx.arc(fan.x, fan.y, fan.size * 0.6, 0, Math.PI * 2);
            ctx.fill();

            // Fan body/shirt
            ctx.fillStyle = fan.color;
            ctx.beginPath();
            ctx.arc(fan.x, fan.y + fan.size, fan.size * 0.8, 0, Math.PI);
            ctx.fill();
        }

        // Some fans holding signs
        ctx.fillStyle = '#fff';
        ctx.fillRect(150, horizonY * 0.35, 30, 20);
        ctx.fillRect(600, horizonY * 0.4, 35, 18);

        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GO!', 165, horizonY * 0.35 + 14);
        ctx.fillText('KICK!', 617, horizonY * 0.4 + 13);
    }

    drawStadiumLights() {
        const ctx = this.ctx;

        // Light poles
        const lightPositions = [100, 700];

        lightPositions.forEach(x => {
            // Pole
            ctx.fillStyle = '#444';
            ctx.fillRect(x - 3, 0, 6, 80);

            // Light bank
            ctx.fillStyle = '#666';
            ctx.fillRect(x - 20, 10, 40, 15);

            // Light glow
            const glow = ctx.createRadialGradient(x, 17, 0, x, 17, 60);
            glow.addColorStop(0, 'rgba(255, 255, 200, 0.3)');
            glow.addColorStop(1, 'rgba(255, 255, 200, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(x - 60, 0, 120, 100);
        });
    }

    drawYardLines() {
        const ctx = this.ctx;
        const horizonY = this.height * 0.4;
        const bottomY = this.height;
        const centerX = this.width / 2;

        // Draw yard lines every 5 yards from goal line (0) to 50 yard line
        // Using perspective: closer lines are larger and further down on screen
        const yardLines = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

        for (let i = 0; i < yardLines.length; i++) {
            const yards = yardLines[i];
            // Map yards to perspective position (0 yards at horizon, 50 at bottom)
            const t = yards / 55; // normalized position
            const y = horizonY + (bottomY - horizonY) * (t * t); // Quadratic for perspective

            // Line gets wider as it gets closer (perspective)
            const halfWidth = 60 + (this.width / 2 - 60) * (t * t);

            // Main yard line
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = yards % 10 === 0 ? 3 : 2; // Thicker lines every 10 yards

            ctx.beginPath();
            ctx.moveTo(centerX - halfWidth, y);
            ctx.lineTo(centerX + halfWidth, y);
            ctx.stroke();

            // Draw yard numbers every 10 yards (except goal line)
            if (yards > 0 && yards % 10 === 0 && yards <= 50) {
                const fontSize = Math.max(16,34 * (t * t + 0.4));
                ctx.font = `bold ${fontSize}px Arial`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Display number (on a real field, numbers go 10,20,30,40,50,40,30,20,10)
                const displayNum = yards === 50 ? 50 : yards;

                // Left side number
                const numberOffset = halfWidth * 0.85;
                ctx.fillText(displayNum.toString(), centerX - numberOffset, y);

                // Right side number
                ctx.fillText(displayNum.toString(), centerX + numberOffset, y);

                // Draw small directional arrows pointing toward goal (triangles)
                if (yards < 50) {
                    const arrowSize = fontSize * 0.4;
                    const arrowOffset = halfWidth * 0.75;

                    // Left arrow (pointing left toward goal)
                    ctx.beginPath();
                    ctx.moveTo(centerX - arrowOffset - fontSize, y);
                    ctx.lineTo(centerX - arrowOffset - fontSize + arrowSize, y - arrowSize);
                    ctx.lineTo(centerX - arrowOffset - fontSize + arrowSize, y + arrowSize);
                    ctx.closePath();
                    ctx.fill();

                    // Right arrow (pointing right toward goal... but wait, goal is same direction)
                    // Actually on a real field, arrows point toward the NEAREST goal
                    // Since we're always looking at one end zone, arrows should point toward horizon
                    ctx.beginPath();
                    ctx.moveTo(centerX + arrowOffset + fontSize, y);
                    ctx.lineTo(centerX + arrowOffset + fontSize - arrowSize, y - arrowSize);
                    ctx.lineTo(centerX + arrowOffset + fontSize - arrowSize, y + arrowSize);
                    ctx.closePath();
                    ctx.fill();
                }
            }
        }

        // Draw the goal line more prominently
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(centerX - 80, horizonY);
        ctx.lineTo(centerX + 80, horizonY);
        ctx.stroke();
    }

    drawHashMarks() {
        const ctx = this.ctx;
        const horizonY = this.height * 0.4;
        const bottomY = this.height;
        const centerX = this.width / 2;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';

        // Draw hash marks at every yard (between the 5-yard lines)
        // NFL hash marks are 70'9" from each sideline, roughly 1/3 from center
        for (let yard = 1; yard <= 50; yard++) {
            // Skip the main yard lines (every 5 yards)
            if (yard % 5 === 0) continue;

            const t = yard / 55;
            const y = horizonY + (bottomY - horizonY) * (t * t);
            const halfWidth = 60 + (this.width / 2 - 60) * (t * t);

            // Hash mark positions (NFL style - near center of field)
            const hashSpread = halfWidth * 0.25; // Hash marks at ~25% from center
            const hashLength = 3 + 5 * (t * t); // Length scales with perspective

            ctx.lineWidth = Math.max(1, 1.5 * t);

            // Left hash mark
            ctx.beginPath();
            ctx.moveTo(centerX - hashSpread, y - hashLength);
            ctx.lineTo(centerX - hashSpread, y + hashLength);
            ctx.stroke();

            // Right hash mark
            ctx.beginPath();
            ctx.moveTo(centerX + hashSpread, y - hashLength);
            ctx.lineTo(centerX + hashSpread, y + hashLength);
            ctx.stroke();

            // Side boundary hash marks (at the edge of the field)
            const sideHashLength = hashLength * 0.7;

            // Left sideline hash
            ctx.beginPath();
            ctx.moveTo(centerX - halfWidth, y - sideHashLength);
            ctx.lineTo(centerX - halfWidth, y + sideHashLength);
            ctx.stroke();

            // Right sideline hash
            ctx.beginPath();
            ctx.moveTo(centerX + halfWidth, y - sideHashLength);
            ctx.lineTo(centerX + halfWidth, y + sideHashLength);
            ctx.stroke();
        }
    }

    drawEndZone() {
        const ctx = this.ctx;
        const horizonY = this.height * 0.4;

        // End zone area
        ctx.fillStyle = 'rgba(139, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.moveTo(this.width / 2 - 80, horizonY);
        ctx.lineTo(this.width / 2 + 80, horizonY);
        ctx.lineTo(this.width / 2 + 100, horizonY + 40);
        ctx.lineTo(this.width / 2 - 100, horizonY + 40);
        ctx.closePath();
        ctx.fill();

        // End zone text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('END ZONE', this.width / 2, horizonY + 25);
    }

    drawGoalPost() {
        const ctx = this.ctx;
        const horizonY = this.height * 0.4;

        // Fixed goal post size - doesn't change with distance
        const postWidth = 120;
        const postHeight = 100;
        const crossbarY = horizonY - 20;
        const crossbarHeight = 8;
        const uprightWidth = 6;
        const uprightHeight = postHeight;

        const centerX = this.width / 2;

        // Goal post shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(centerX - postWidth / 2 - 5, crossbarY + 5, postWidth + 10, crossbarHeight);

        // Main vertical post (behind crossbar)
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(centerX - uprightWidth / 2, crossbarY, uprightWidth, postHeight + 50);

        // Crossbar
        const gradient = ctx.createLinearGradient(0, crossbarY, 0, crossbarY + crossbarHeight);
        gradient.addColorStop(0, '#ffed4a');
        gradient.addColorStop(0.5, '#ffd700');
        gradient.addColorStop(1, '#b8860b');
        ctx.fillStyle = gradient;
        ctx.fillRect(centerX - postWidth / 2, crossbarY, postWidth, crossbarHeight);

        // Left upright
        const uprightGradient = ctx.createLinearGradient(centerX - postWidth / 2 - uprightWidth, 0,
                                                          centerX - postWidth / 2, 0);
        uprightGradient.addColorStop(0, '#b8860b');
        uprightGradient.addColorStop(0.5, '#ffd700');
        uprightGradient.addColorStop(1, '#ffed4a');
        ctx.fillStyle = uprightGradient;
        ctx.fillRect(centerX - postWidth / 2 - uprightWidth / 2, crossbarY - uprightHeight,
                    uprightWidth, uprightHeight);

        // Right upright
        ctx.fillStyle = uprightGradient;
        ctx.fillRect(centerX + postWidth / 2 - uprightWidth / 2, crossbarY - uprightHeight,
                    uprightWidth, uprightHeight);

        // Upright caps
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(centerX - postWidth / 2, crossbarY - uprightHeight, uprightWidth, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX + postWidth / 2, crossbarY - uprightHeight, uprightWidth, 0, Math.PI * 2);
        ctx.fill();

        // Store goal post dimensions for collision detection
        this.goalPostBounds = {
            leftX: centerX - postWidth / 2,
            rightX: centerX + postWidth / 2,
            topY: crossbarY - uprightHeight,
            crossbarY: crossbarY
        };
    }

    drawBall(x, y, scale = 1, rotation = 0) {
        const ctx = this.ctx;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.scale(scale, scale);

        // Ball shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(3, 3, 18, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        // Main ball shape (brown leather)
        const ballGradient = ctx.createRadialGradient(-5, -5, 0, 0, 0, 20);
        ballGradient.addColorStop(0, '#8B4513');
        ballGradient.addColorStop(0.7, '#654321');
        ballGradient.addColorStop(1, '#3d2314');
        ctx.fillStyle = ballGradient;
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ball outline
        ctx.strokeStyle = '#2d1810';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Laces
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;

        // Center lace line
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(8, 0);
        ctx.stroke();

        // Cross laces
        for (let i = -6; i <= 6; i += 4) {
            ctx.beginPath();
            ctx.moveTo(i, -4);
            ctx.lineTo(i, 4);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawKicker(x, y, scale = 1) {
        const ctx = this.ctx;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        // Simple kicker silhouette
        ctx.fillStyle = '#1a1a2e';

        // Body
        ctx.beginPath();
        ctx.ellipse(0, -30, 15, 25, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.beginPath();
        ctx.arc(0, -60, 12, 0, Math.PI * 2);
        ctx.fill();

        // Kicking leg
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(20, -5);
        ctx.stroke();

        // Standing leg
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(-10, 0);
        ctx.stroke();

        // Helmet highlight
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(0, -60, 10, -Math.PI * 0.8, -Math.PI * 0.2);
        ctx.fill();

        ctx.restore();
    }

    drawPlayer(x, y, scale, teamColor, helmetColor, facingLeft = false, jerseyNum = null) {
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        if (facingLeft) ctx.scale(-1, 1);

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 5, 12, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Legs
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(-8, -15, 6, 20);
        ctx.fillRect(2, -15, 6, 20);

        // Body
        ctx.fillStyle = teamColor;
        ctx.beginPath();
        ctx.ellipse(0, -30, 14, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Jersey number
        if (jerseyNum) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(jerseyNum.toString(), 0, -26);
        }

        // Head/Helmet
        ctx.fillStyle = helmetColor;
        ctx.beginPath();
        ctx.arc(0, -52, 10, 0, Math.PI * 2);
        ctx.fill();

        // Facemask
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(facingLeft ? 5 : -5, -52, 6, -0.5, 0.5);
        ctx.stroke();

        ctx.restore();
    }

    drawOffensiveLine(lineOfScrimmageY, distanceScale = 1) {
        const ctx = this.ctx;
        const centerX = this.width / 2;

        // Offensive line is at the line of scrimmage, in blocking stance
        const lineY = lineOfScrimmageY - 50 * distanceScale;
        const scale = 0.75 * distanceScale;
        const spacing = 40 * distanceScale;

        // Long snapper (center) - already snapped, now blocking
        this.drawPlayer(centerX, lineY, scale, '#1a3a6e', '#ffd700', false, 55);

        // Guards - blocking
        this.drawPlayer(centerX - spacing, lineY, scale, '#1a3a6e', '#ffd700', false, 64);
        this.drawPlayer(centerX + spacing, lineY, scale, '#1a3a6e', '#ffd700', false, 68);

        // Tackles - blocking on edges
        this.drawPlayer(centerX - spacing * 2, lineY, scale * 0.95, '#1a3a6e', '#ffd700', false, 72);
        this.drawPlayer(centerX + spacing * 2, lineY, scale * 0.95, '#1a3a6e', '#ffd700', false, 76);

        // Tight ends / wing blockers - wider
        this.drawPlayer(centerX - spacing * 3, lineY, scale * 0.9, '#1a3a6e', '#ffd700', false, 85);
        this.drawPlayer(centerX + spacing * 3, lineY, scale * 0.9, '#1a3a6e', '#ffd700', false, 88);
    }

    drawHolder(ballX, ballY, scale = 1) {
        const ctx = this.ctx;

        ctx.save();
        ctx.translate(ballX + 25 * scale, ballY);
        ctx.scale(scale, scale);

        // Kneeling body
        ctx.fillStyle = '#1a3a6e';
        ctx.beginPath();
        ctx.ellipse(0, -15, 12, 15, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Arm reaching to ball
        ctx.strokeStyle = '#1a3a6e';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-8, -15);
        ctx.lineTo(-20, -5);
        ctx.stroke();

        // Head
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(3, -32, 9, 0, Math.PI * 2);
        ctx.fill();

        // Facemask
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(-2, -32, 5, 2.5, 3.8);
        ctx.stroke();

        ctx.restore();
    }

    drawDefensiveLine(lineOfScrimmageY, rushProgress = 0, distanceScale = 1) {
        const ctx = this.ctx;
        const centerX = this.width / 2;

        // Defensive line starts at the line of scrimmage (across from offense)
        // As rushProgress increases (0 to 1), they push through toward the kicker
        const startY = lineOfScrimmageY - 55 * distanceScale;
        const rushDistance = 40 * rushProgress * distanceScale;
        const currentY = startY + rushDistance;

        // Base scale from distance, plus slight increase as they rush closer
        const scale = (0.7 + (rushProgress * 0.15)) * distanceScale;
        const spacing = 35 * distanceScale;

        // Defensive tackles - interior rush
        this.drawPlayer(centerX - spacing, currentY, scale, '#8b0000', '#c0c0c0', true, 92);
        this.drawPlayer(centerX + spacing, currentY, scale, '#8b0000', '#c0c0c0', true, 97);

        // Defensive ends - edge rush
        const edgeRushX = rushProgress * 25 * distanceScale;
        this.drawPlayer(centerX - spacing * 2.4 + edgeRushX, currentY - 5 * distanceScale, scale * 0.95, '#8b0000', '#c0c0c0', true, 91);
        this.drawPlayer(centerX + spacing * 2.4 - edgeRushX, currentY - 5 * distanceScale, scale * 0.95, '#8b0000', '#c0c0c0', true, 99);

        // Edge rushers - speed rush around the edge
        const speedRushX = rushProgress * 40 * distanceScale;
        this.drawPlayer(centerX - spacing * 3.7 + speedRushX, currentY + 5 * distanceScale, scale * 0.9, '#8b0000', '#c0c0c0', true, 56);
        this.drawPlayer(centerX + spacing * 3.7 - speedRushX, currentY + 5 * distanceScale, scale * 0.9, '#8b0000', '#c0c0c0', true, 52);
    }

    drawBlockedKick(lineOfScrimmageX, lineOfScrimmageY, scale = 1) {
        const ctx = this.ctx;

        // Draw a defender with arms up, having broken through to block the kick
        ctx.save();
        ctx.translate(lineOfScrimmageX, lineOfScrimmageY - 30 * scale);
        ctx.scale(scale, scale);

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 25, 15, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Legs spread in blocking stance
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(-15, 0, 8, 25);
        ctx.fillRect(7, 0, 8, 25);

        // Body
        ctx.fillStyle = '#8b0000';
        ctx.beginPath();
        ctx.ellipse(0, -15, 18, 22, 0, 0, Math.PI * 2);
        ctx.fill();

        // Arms up blocking
        ctx.strokeStyle = '#8b0000';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-12, -25);
        ctx.lineTo(-25, -55);
        ctx.moveTo(12, -25);
        ctx.lineTo(25, -55);
        ctx.stroke();

        // Hands
        ctx.fillStyle = '#ffd5b5';
        ctx.beginPath();
        ctx.arc(-25, -58, 6, 0, Math.PI * 2);
        ctx.arc(25, -58, 6, 0, Math.PI * 2);
        ctx.fill();

        // Helmet
        ctx.fillStyle = '#c0c0c0';
        ctx.beginPath();
        ctx.arc(0, -42, 12, 0, Math.PI * 2);
        ctx.fill();

        // Facemask
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -40, 8, 2.5, 3.8);
        ctx.stroke();

        ctx.restore();
    }

    drawTimer(timeLeft, maxTime) {
        const ctx = this.ctx;
        const x = this.width - 80;
        const y = 80;
        const radius = 30;

        // Background circle
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
        ctx.fill();

        // Timer arc background
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(x, y, radius, -Math.PI / 2, Math.PI * 1.5);
        ctx.stroke();

        // Timer arc (remaining time)
        const progress = timeLeft / maxTime;
        const color = progress > 0.5 ? '#4ade80' : progress > 0.25 ? '#fbbf24' : '#ef4444';
        ctx.strokeStyle = color;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress), false);
        ctx.stroke();

        // Time text
        ctx.fillStyle = color;
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.ceil(timeLeft / 1000).toString(), x, y);

        // Label
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.fillText('SNAP!', x, y + 45);
    }

    drawMessage(text, subtext = '', color = '#ffd700') {
        const ctx = this.ctx;

        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(this.width / 2 - 200, this.height / 2 - 60, 400, 120);

        // Main text
        ctx.fillStyle = color;
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, this.width / 2, this.height / 2 - 15);

        // Subtext
        if (subtext) {
            ctx.fillStyle = '#fff';
            ctx.font = '20px Arial';
            ctx.fillText(subtext, this.width / 2, this.height / 2 + 30);
        }
    }

    drawDistanceMarker(distance) {
        const ctx = this.ctx;
        const bottomY = this.height - 50;

        // Distance marker
        ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${distance} YARD ATTEMPT`, this.width / 2, bottomY);

        // Decorative lines
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.width / 2 - 150, bottomY + 10);
        ctx.lineTo(this.width / 2 - 50, bottomY + 10);
        ctx.moveTo(this.width / 2 + 50, bottomY + 10);
        ctx.lineTo(this.width / 2 + 150, bottomY + 10);
        ctx.stroke();
    }

    drawInstructions(state) {
        const ctx = this.ctx;
        let text = '';

        switch (state) {
            case 'READY':
                text = 'Press SPACE or click to start';
                break;
            case 'POWER':
                text = 'Press SPACE or click to set POWER';
                break;
            case 'ACCURACY':
                text = 'Press SPACE or click to set ACCURACY';
                break;
        }

        if (text) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = '18px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(text, this.width / 2, this.height - 100);
        }
    }
}
