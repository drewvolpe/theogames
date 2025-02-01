class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Goalie (Chicken Tender) properties
        this.goalie = {
            x: this.canvas.width / 2 - 30,
            y: this.canvas.height - 100, // Keep same distance from bottom
            width: 60,
            height: 80,
            speed: 5,
            color: '#FFD700', // Brighter gold color
            isDiving: false,
            diveDirection: null
        };

        // Hot Dog properties
        this.hotdog = {
            x: this.canvas.width / 2 - 20,
            y: 80, // Adjust starting height
            width: 40,
            height: 60,
            speed: 3,
            color: '#FF4444',
            hasKicked: false,
            originalY: 80, // Update original Y position
            isMovingForward: false
        };

        // Ball properties with increased speed
        this.ball = {
            x: this.canvas.width / 2,
            y: 200,
            radius: 15,
            speed: 9.5, // Increased from 7 (35% faster)
            velocityX: 0,
            velocityY: 0,
            color: '#FFFFFF',
            isMoving: false,
            curve: 0,
            hasCurve: false,
            switchDirectionTimer: 0,
            willSwitchDirection: false
        };

        // Goal properties
        this.goal = {
            width: 400,
            height: 100,
            x: (this.canvas.width - 400) / 2,
            y: this.canvas.height - 50,
            postWidth: 10 // Add goal posts
        };

        // Game state
        this.score = 0;
        this.gameOver = false;
        this.ballInPlay = false;

        // Controls
        this.leftPressed = false;
        this.rightPressed = false;
        this.upPressed = false;
        this.downPressed = false;

        // Event listeners
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));

        // Add target zone for kicks
        this.targetZone = {
            minX: this.goal.x + 20,  // Slightly inside left post
            maxX: this.goal.x + this.goal.width - 20,  // Slightly inside right post
            y: this.goal.y - this.goal.height / 2  // Middle of goal height
        };

        // Add miss probability
        this.missProbability = 0.15; // 15% chance to miss

        // Add timer properties
        this.kickTimer = 0;
        this.kickDelay = 120; // 2 seconds at 60fps
        this.isWaiting = false;

        // Add dribble properties
        this.isDribbling = false;
        this.dribbleCounter = 0;
        this.dribbleEveryNShots = 3; // Dribble every 3 shots
        this.dribbleSteps = 0;
        this.dribbleMaxSteps = 30; // How many steps to take while dribbling
        this.dribbleDirection = 1; // 1 for right, -1 for left
        this.originalBallY = 200; // Store original ball Y position
        
        // Add movement patterns for dribbling
        this.dribblePatterns = [
            { moveX: 1, moveY: 1 },   // Diagonal right down
            { moveX: -1, moveY: 1 },  // Diagonal left down
            { moveX: 0, moveY: 1 }    // Straight down
        ];
        this.currentPattern = 0;

        // Add goal counter and high score
        this.goals = 0;
        this.maxGoals = 5;
        this.highScore = localStorage.getItem('goalTenderHighScore') || 0;
        this.isDancing = false;
        this.danceSteps = 0;
        this.danceMaxSteps = 120; // 2 seconds of dancing at 60fps

        // Update curve probability from 0.3 to 0.5
        this.curveProbability = 0.5; // 50% chance of curve
        this.directionSwitchProbability = 0.2; // Keep direction switch at 20%

        // Start game loop
        this.gameLoop();
    }

    handleKeyDown(e) {
        if (e.key === 'ArrowLeft') this.leftPressed = true;
        if (e.key === 'ArrowRight') this.rightPressed = true;
        if (e.key === 'ArrowUp') this.upPressed = true;
        if (e.key === 'ArrowDown') this.downPressed = true;
        if (e.key === 'r' && this.gameOver) {
            this.resetGame();
        }
    }

    handleKeyUp(e) {
        if (e.key === 'ArrowLeft') this.leftPressed = false;
        if (e.key === 'ArrowRight') this.rightPressed = false;
        if (e.key === 'ArrowUp') this.upPressed = false;
        if (e.key === 'ArrowDown') this.downPressed = false;
    }

    update() {
        if (this.gameOver) {
            if (this.isDancing) {
                this.updateDance();
            }
            return;
        }

        // Update goalie position
        if (this.leftPressed) this.goalie.x -= this.goalie.speed;
        if (this.rightPressed) this.goalie.x += this.goalie.speed;
        if (this.upPressed) this.goalie.y -= this.goalie.speed;
        if (this.downPressed) this.goalie.y += this.goalie.speed;

        // Keep goalie in bounds
        this.goalie.x = Math.max(0, Math.min(this.canvas.width - this.goalie.width, this.goalie.x));
        this.goalie.y = Math.max(this.canvas.height - 200, Math.min(this.canvas.height - 50, this.goalie.y));

        // Move hot dog towards ball if not kicked
        if (!this.ball.isMoving && !this.isWaiting) {
            if (this.isDribbling) {
                this.updateDribble();
            } else if (this.hotdog.isMovingForward) {
                // Move forward to kick
                this.hotdog.y += this.hotdog.speed;
                if (this.hotdog.y >= this.ball.y - this.hotdog.height/2) {
                    // Reached ball, kick it
                    this.kickBall();
                    this.hotdog.isMovingForward = false;
                    this.isWaiting = true;
                    this.kickTimer = this.kickDelay;
                    this.dribbleCounter++;
                }
            } else if (Math.abs(this.hotdog.x - this.ball.x) > 5) {
                // Move horizontally to align with ball
                this.hotdog.x += this.hotdog.speed * Math.sign(this.ball.x - this.hotdog.x);
            } else {
                // Decide whether to dribble or kick
                if (this.dribbleCounter % this.dribbleEveryNShots === 0 && !this.isDribbling) {
                    this.startDribble();
                } else {
                    this.hotdog.isMovingForward = true;
                }
            }
        }

        // Handle waiting period
        if (this.isWaiting) {
            this.kickTimer--;
            if (this.kickTimer <= 0) {
                this.isWaiting = false;
                this.resetHotDog();
            }
        }

        // Update ball position with curves and direction changes
        if (this.ball.isMoving) {
            // Apply curve if active
            if (this.ball.hasCurve) {
                this.ball.velocityX += this.ball.curve;
            }

            // Check for direction switch
            if (this.ball.willSwitchDirection) {
                this.ball.switchDirectionTimer--;
                if (this.ball.switchDirectionTimer <= 0) {
                    // Switch direction
                    this.ball.velocityX *= -0.8;
                    this.ball.willSwitchDirection = false;
                }
            }

            this.ball.x += this.ball.velocityX;
            this.ball.y += this.ball.velocityY;

            // Check for collision with goalie
            if (this.checkCollision(this.ball, this.goalie)) {
                this.score++;
                this.resetBall();
            }

            // Check if ball is past goal line
            if (this.ball.y > this.canvas.height) {
                if (this.ball.x < this.goal.x || this.ball.x > this.goal.x + this.goal.width) {
                    // Ball went wide
                    this.score++;
                    this.resetBall();
                } else {
                    // Goal scored
                    this.goals++;
                    if (this.goals >= this.maxGoals) {
                        this.endGame();
                    }
                    this.resetBall();
                }
            }
        }
    }

    startDribble() {
        this.isDribbling = true;
        this.dribbleSteps = 0;
        this.currentPattern = Math.floor(Math.random() * this.dribblePatterns.length);
        this.dribbleDirection = Math.random() < 0.5 ? 1 : -1;
    }

    updateDribble() {
        if (this.dribbleSteps >= this.dribbleMaxSteps) {
            // Finished dribbling, take the shot
            this.isDribbling = false;
            this.hotdog.isMovingForward = true;
            return;
        }

        const pattern = this.dribblePatterns[this.currentPattern];
        
        // Move hot dog and ball together
        const moveX = pattern.moveX * this.hotdog.speed * this.dribbleDirection;
        const moveY = pattern.moveY * this.hotdog.speed;

        // Check boundaries for horizontal movement
        const newHotDogX = this.hotdog.x + moveX;
        if (newHotDogX > 50 && newHotDogX < this.canvas.width - 50) {
            this.hotdog.x = newHotDogX;
            this.ball.x = this.hotdog.x + this.hotdog.width/2;
        } else {
            // Change direction if hitting boundaries
            this.dribbleDirection *= -1;
        }

        // Move vertically (closer to goal)
        const maxAdvance = (this.canvas.height - this.originalBallY) * 0.5; // 50% closer
        if (this.ball.y < this.originalBallY + maxAdvance) {
            this.hotdog.y += moveY;
            this.ball.y += moveY;
        }

        this.dribbleSteps++;

        // Randomly change pattern occasionally
        if (this.dribbleSteps % 10 === 0) {
            this.currentPattern = Math.floor(Math.random() * this.dribblePatterns.length);
        }
    }

    resetBall() {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.originalBallY;
        this.ball.isMoving = false;
        this.ball.velocityX = 0;
        this.ball.velocityY = 0;
        this.ball.curve = 0;
        this.ball.hasCurve = false;
        this.ball.willSwitchDirection = false;
        this.resetHotDog();
        this.isDribbling = false;
    }

    resetHotDog() {
        this.hotdog.x = this.canvas.width / 2;
        this.hotdog.y = this.hotdog.originalY;
        this.hotdog.isMovingForward = false;
        this.hotdog.hasKicked = false;
    }

    checkCollision(ball, rect) {
        const closestX = Math.max(rect.x, Math.min(ball.x, rect.x + rect.width));
        const closestY = Math.max(rect.y, Math.min(ball.y, rect.y + rect.height));
        const distanceX = ball.x - closestX;
        const distanceY = ball.y - closestY;
        return (distanceX * distanceX + distanceY * distanceY) < (ball.radius * ball.radius);
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#228B22'; // Forest green for field
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw goal posts
        this.ctx.fillStyle = '#FFFFFF';
        // Left post
        this.ctx.fillRect(this.goal.x - this.goal.postWidth, 
                         this.goal.y - this.goal.height, 
                         this.goal.postWidth, 
                         this.goal.height);
        // Right post
        this.ctx.fillRect(this.goal.x + this.goal.width, 
                         this.goal.y - this.goal.height, 
                         this.goal.postWidth, 
                         this.goal.height);
        // Crossbar
        this.ctx.fillRect(this.goal.x - this.goal.postWidth, 
                         this.goal.y - this.goal.height, 
                         this.goal.width + this.goal.postWidth * 2, 
                         this.goal.postWidth);

        // Draw goal net (lines)
        this.ctx.strokeStyle = '#CCCCCC';
        this.ctx.lineWidth = 2;
        for(let i = 0; i < 10; i++) {
            // Vertical lines
            this.ctx.beginPath();
            this.ctx.moveTo(this.goal.x + (i * this.goal.width/10), this.goal.y - this.goal.height);
            this.ctx.lineTo(this.goal.x + (i * this.goal.width/10), this.goal.y);
            this.ctx.stroke();
        }

        // Draw goalie (chicken tender)
        this.ctx.fillStyle = this.goalie.color;
        this.ctx.fillRect(this.goalie.x, this.goalie.y, this.goalie.width, this.goalie.height);

        // Draw hot dog
        this.ctx.fillStyle = this.hotdog.color;
        this.ctx.fillRect(this.hotdog.x, this.hotdog.y, this.hotdog.width, this.hotdog.height);

        // Draw ball
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = this.ball.color;
        this.ctx.fill();
        // Add ball details
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Draw score and goal counter
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 32px Arial';
        this.ctx.fillText(`Score: ${this.score}`, 10, 40);

        // Draw goal counter circles
        const circleRadius = 15;
        const circleSpacing = 40;
        const startX = 10;
        const startY = 70;

        for (let i = 0; i < this.maxGoals; i++) {
            this.ctx.beginPath();
            this.ctx.arc(startX + (circleSpacing * i) + circleRadius, startY, circleRadius, 0, Math.PI * 2);
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            if (i < this.goals) {
                this.ctx.fillStyle = '#FF0000';
                this.ctx.fill();
            }
        }

        // Draw game over screen
        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            
            this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 60);
            this.ctx.font = 'bold 32px Arial';
            this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.fillText(`High Score: ${this.highScore}`, this.canvas.width / 2, this.canvas.height / 2 + 50);
            this.ctx.fillText('Press R to Restart', this.canvas.width / 2, this.canvas.height / 2 + 100);
            
            this.ctx.textAlign = 'left';
        }
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    kickBall() {
        this.ball.isMoving = true;
        this.ball.hasCurve = Math.random() < this.curveProbability;
        this.ball.willSwitchDirection = Math.random() < this.directionSwitchProbability;
        this.ball.switchDirectionTimer = Math.floor(Math.random() * 30) + 15; // Switch direction after 15-45 frames

        // Decide if this shot will be a miss
        const willMiss = Math.random() < this.missProbability;

        let targetX;
        if (willMiss) {
            targetX = Math.random() < 0.5 ? 
                this.goal.x - 50 : 
                this.goal.x + this.goal.width + 50;
        } else {
            targetX = Math.random() * (this.targetZone.maxX - this.targetZone.minX) + this.targetZone.minX;
        }

        const targetY = this.goal.y - Math.random() * (this.goal.height * 0.8);
        const dx = targetX - this.ball.x;
        const dy = targetY - this.ball.y;
        const angle = Math.atan2(dy, dx);

        // Add some random variation to the speed
        const speedVariation = 0.8 + Math.random() * 0.4;
        this.ball.velocityX = Math.cos(angle) * this.ball.speed * speedVariation;
        this.ball.velocityY = Math.sin(angle) * this.ball.speed * speedVariation;

        // Add curve if applicable
        if (this.ball.hasCurve) {
            this.ball.curve = (Math.random() - 0.5) * 0.5; // Random curve strength and direction
        }
    }

    endGame() {
        this.gameOver = true;
        this.isDancing = true;
        // Update high score if current score is higher
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('goalTenderHighScore', this.highScore);
        }
    }

    updateDance() {
        // Make the hot dog dance
        this.danceSteps++;
        if (this.danceSteps >= this.danceMaxSteps) {
            this.isDancing = false;
        }
        
        // Simple dance movement
        this.hotdog.y = this.hotdog.originalY + Math.sin(this.danceSteps * 0.2) * 20;
        this.hotdog.x = this.canvas.width / 2 + Math.cos(this.danceSteps * 0.2) * 30;
    }

    resetGame() {
        this.score = 0;
        this.goals = 0;
        this.gameOver = false;
        this.isDancing = false;
        this.danceSteps = 0;
        this.resetBall();
        // ... rest of existing reset code ...
    }
}

window.onload = () => {
    new Game();
}; 