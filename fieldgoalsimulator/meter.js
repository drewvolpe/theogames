// Meter System for Field Goal Kicking
class Meter {
    constructor(type, x, y, width, height) {
        this.type = type; // 'power' or 'accuracy'
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.value = 0;           // Current marker position (0-1)
        this.lockedValue = null;  // Locked value after click
        this.direction = 1;       // 1 = increasing, -1 = decreasing
        this.speed = 0.02;        // Base speed (adjusted by difficulty)
        this.isActive = false;    // Whether meter is animating
    }

    start(speed) {
        this.isActive = true;
        this.lockedValue = null;
        this.value = this.type === 'power' ? 0 : 0.5;
        this.direction = 1;
        this.speed = speed;
    }

    stop() {
        this.lockedValue = this.value;
        this.isActive = false;
        return this.lockedValue;
    }

    reset() {
        this.value = this.type === 'power' ? 0 : 0.5;
        this.lockedValue = null;
        this.isActive = false;
    }

    update() {
        if (!this.isActive) return;

        this.value += this.direction * this.speed;

        // Bounce at boundaries
        if (this.value >= 1) {
            this.value = 1;
            this.direction = -1;
        } else if (this.value <= 0) {
            this.value = 0;
            this.direction = 1;
        }
    }

    draw(ctx) {
        const isVertical = this.type === 'power';

        // Draw meter background
        ctx.fillStyle = '#2a2a4a';
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;

        // Rounded rectangle for meter
        this.roundRect(ctx, this.x, this.y, this.width, this.height, 5);
        ctx.fill();
        ctx.stroke();

        // Draw zones (colored sections)
        this.drawZones(ctx, isVertical);

        // Draw marker
        this.drawMarker(ctx, isVertical);

        // Draw label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';

        if (isVertical) {
            ctx.save();
            ctx.translate(this.x - 10, this.y + this.height / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText('POWER', 0, 0);
            ctx.restore();
        } else {
            ctx.fillText('ACCURACY', this.x + this.width / 2, this.y - 10);
        }
    }

    drawZones(ctx, isVertical) {
        const padding = 3;

        if (isVertical) {
            // Power meter zones (bottom to top: red, yellow, green, yellow, red)
            const innerHeight = this.height - padding * 2;
            const innerWidth = this.width - padding * 2;

            // Red zone (0-30%)
            ctx.fillStyle = '#8B0000';
            ctx.fillRect(this.x + padding, this.y + padding + innerHeight * 0.7,
                        innerWidth, innerHeight * 0.3);

            // Yellow zone (30-70%)
            ctx.fillStyle = '#DAA520';
            ctx.fillRect(this.x + padding, this.y + padding + innerHeight * 0.3,
                        innerWidth, innerHeight * 0.4);

            // Green zone (70-100%) - sweet spot
            ctx.fillStyle = '#228B22';
            ctx.fillRect(this.x + padding, this.y + padding,
                        innerWidth, innerHeight * 0.3);
        } else {
            // Accuracy meter zones (left to right: red, yellow, green, yellow, red)
            const innerWidth = this.width - padding * 2;
            const innerHeight = this.height - padding * 2;

            // Red zone left (0-15%)
            ctx.fillStyle = '#8B0000';
            ctx.fillRect(this.x + padding, this.y + padding,
                        innerWidth * 0.15, innerHeight);

            // Yellow zone left (15-35%)
            ctx.fillStyle = '#DAA520';
            ctx.fillRect(this.x + padding + innerWidth * 0.15, this.y + padding,
                        innerWidth * 0.2, innerHeight);

            // Green zone center (35-65%) - sweet spot
            ctx.fillStyle = '#228B22';
            ctx.fillRect(this.x + padding + innerWidth * 0.35, this.y + padding,
                        innerWidth * 0.3, innerHeight);

            // Yellow zone right (65-85%)
            ctx.fillStyle = '#DAA520';
            ctx.fillRect(this.x + padding + innerWidth * 0.65, this.y + padding,
                        innerWidth * 0.2, innerHeight);

            // Red zone right (85-100%)
            ctx.fillStyle = '#8B0000';
            ctx.fillRect(this.x + padding + innerWidth * 0.85, this.y + padding,
                        innerWidth * 0.15, innerHeight);
        }
    }

    drawMarker(ctx, isVertical) {
        const displayValue = this.lockedValue !== null ? this.lockedValue : this.value;

        ctx.fillStyle = this.lockedValue !== null ? '#fff' : '#ffd700';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;

        if (isVertical) {
            // Marker position (inverted because 0 is bottom, 1 is top)
            const markerY = this.y + this.height - (displayValue * this.height);

            // Draw triangle marker on left
            ctx.beginPath();
            ctx.moveTo(this.x - 5, markerY);
            ctx.lineTo(this.x - 15, markerY - 8);
            ctx.lineTo(this.x - 15, markerY + 8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Draw line across meter
            ctx.strokeStyle = this.lockedValue !== null ? '#fff' : '#ffd700';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.x, markerY);
            ctx.lineTo(this.x + this.width, markerY);
            ctx.stroke();
        } else {
            // Horizontal marker
            const markerX = this.x + (displayValue * this.width);

            // Draw triangle marker on top
            ctx.beginPath();
            ctx.moveTo(markerX, this.y - 5);
            ctx.lineTo(markerX - 8, this.y - 15);
            ctx.lineTo(markerX + 8, this.y - 15);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Draw line down meter
            ctx.strokeStyle = this.lockedValue !== null ? '#fff' : '#ffd700';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(markerX, this.y);
            ctx.lineTo(markerX, this.y + this.height);
            ctx.stroke();
        }
    }

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    // Get the quality of the locked value (for scoring feedback)
    getQuality() {
        if (this.lockedValue === null) return 'none';

        if (this.type === 'power') {
            if (this.lockedValue >= 0.7) return 'perfect';
            if (this.lockedValue >= 0.3) return 'good';
            return 'weak';
        } else {
            const deviation = Math.abs(this.lockedValue - 0.5);
            if (deviation <= 0.15) return 'perfect';
            if (deviation <= 0.35) return 'good';
            return 'bad';
        }
    }
}
