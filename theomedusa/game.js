class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        // Remove the dynamic canvas sizing
        this.ctx = this.canvas.getContext('2d');

        // Player properties
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 50,
            width: 100,
            height: 100,
            speed: 5,
            color: '#4488ff'
        };

        // Medusa properties
        this.medusa = {
            x: this.canvas.width / 2,
            y: 50,
            width: 80,
            height: 80,
            speed: 2,
            direction: 1,
            color: '#ff4444'
        };

        // Game state
        this.snakes = [];
        this.score = 0;
        this.gameOver = false;
        this.snakeSpeed = 5;
        this.snakeSpawnRate = 60;
        this.frameCount = 0;
        this.petrificationAttacks = [];
        this.petrificationMinTime = 4000;  // 4s between p attacks
        this.petrificationMaxTime = 10000; // 
        this.lastTimeStamp = 0;
        this.playerFrozen = false;
        this.freezeTimer = 0;
        this.freezeDuration = 180; // 3 seconds at 60fps

        // Add this line to initialize the first attack timer
        this.nextPetrificationTime = this.getNextPetrificationTime();

        // Event listeners
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));

        // Movement flags
        this.leftPressed = false;
        this.rightPressed = false;

        // Add after other properties
        this.medusaImage = new Image();
        this.medusaImage.src = 'medusa.jpg'; 
        this.medusaImageLoaded = false;
        this.medusaImage.onload = () => {
            this.medusaImageLoaded = true;
        };

        // Add second Medusa properties (initially null)
        this.medusa2 = null;
        this.medusa2Active = false;

        // Add third Medusa properties after second Medusa properties
        this.medusa3 = null;
        this.medusa3Active = false;

        // Add after medusa image loading
        this.perseusImage = new Image();
        this.perseusImage.src = 'perseus.png';
        this.perseusImageLoaded = false;
        this.perseusImage.onload = () => {
            this.perseusImageLoaded = true;
        };

        // Start game loop
        this.gameLoop();

        // At the start of the file, after initializing the canvas
        const leftBtn = document.getElementById('leftBtn');
        const rightBtn = document.getElementById('rightBtn');

        // Add these event listeners after your existing keyboard event listeners
        leftBtn.addEventListener('mousedown', () => this.leftPressed = true);
        leftBtn.addEventListener('mouseup', () => this.leftPressed = false);
        leftBtn.addEventListener('mouseleave', () => this.leftPressed = false);
        leftBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.leftPressed = true;
        });
        leftBtn.addEventListener('touchend', () => this.leftPressed = false);

        rightBtn.addEventListener('mousedown', () => this.rightPressed = true);
        rightBtn.addEventListener('mouseup', () => this.rightPressed = false);
        rightBtn.addEventListener('mouseleave', () => this.rightPressed = false);
        rightBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.rightPressed = true;
        });
        rightBtn.addEventListener('touchend', () => this.rightPressed = false);
    }

    handleKeyDown(e) {
        if (e.key === 'ArrowLeft') this.leftPressed = true;
        if (e.key === 'ArrowRight') this.rightPressed = true;
        if (e.key === 'r' && this.gameOver) this.resetGame();
    }

    handleKeyUp(e) {
        if (e.key === 'ArrowLeft') this.leftPressed = false;
        if (e.key === 'ArrowRight') this.rightPressed = false;
    }

    resetGame() {
        this.player.x = this.canvas.width / 2;
        this.medusa.x = this.canvas.width / 2;
        this.snakes = [];
        this.petrificationAttacks = [];
        this.playerFrozen = false;
        this.freezeTimer = 0;
        this.score = 0;
        this.gameOver = false;
        this.frameCount = 0;
        this.nextPetrificationTime = this.getNextPetrificationTime();
        this.lastTimeStamp = 0;
        this.medusa2 = null;
        this.medusa2Active = false;
        this.medusa3 = null;
        this.medusa3Active = false;
    }

    getNextPetrificationTime() {
        return Math.random() * (this.petrificationMaxTime - this.petrificationMinTime) + this.petrificationMinTime;
    }

    update() {
        if (this.gameOver) return;

        // add second Medusa if hit score
        if (this.score >= 30 && !this.medusa2Active) {
            this.medusa2 = {
                x: this.canvas.width / 4,  // Start at 1/4 of screen
                y: 50,
                width: 80,
                height: 80,
                speed: 2.5,  // Slightly faster than first Medusa
                direction: -1,  // Start moving in opposite direction
                color: '#ff4444'
            };
            this.medusa2Active = true;
        }

        // Add check for third Medusa activation
        if (this.score >= 90 && !this.medusa3Active) {
            this.medusa3 = {
                x: this.canvas.width * 3/4,  // Start at 3/4 of screen
                y: 50,
                width: 80,
                height: 80,
                speed: 3,  // Even faster than second Medusa
                direction: 1,
                color: '#ff4444'
            };
            this.medusa3Active = true;
        }

        // Update freeze timer if player is frozen
        if (this.playerFrozen) {
            this.freezeTimer--;
            if (this.freezeTimer <= 0) {
                this.playerFrozen = false;
            }
        }

        // Update player position (only if not frozen)
        if (!this.playerFrozen) {
            if (this.leftPressed) {
                this.player.x -= this.player.speed;
            }
            if (this.rightPressed) {
                this.player.x += this.player.speed;
            }
        }

        // Keep player in bounds
        this.player.x = Math.max(this.player.width / 2, Math.min(this.canvas.width - this.player.width / 2, this.player.x));

        // Update both Medusas' positions
        this.medusa.x += this.medusa.speed * this.medusa.direction;
        if (this.medusa.x > this.canvas.width - this.medusa.width || this.medusa.x < 0) {
            this.medusa.direction *= -1;
        }

        if (this.medusa2Active) {
            this.medusa2.x += this.medusa2.speed * this.medusa2.direction;
            if (this.medusa2.x > this.canvas.width - this.medusa2.width || this.medusa2.x < 0) {
                this.medusa2.direction *= -1;
            }
        }

        // Add third Medusa movement
        if (this.medusa3Active) {
            this.medusa3.x += this.medusa3.speed * this.medusa3.direction;
            if (this.medusa3.x > this.canvas.width - this.medusa3.width || this.medusa3.x < 0) {
                this.medusa3.direction *= -1;
            }
        }

        // Spawn snakes from both Medusas
        if (this.frameCount % this.snakeSpawnRate === 0) {
            // Snakes from first Medusa
            this.snakes.push({
                x: this.medusa.x + this.medusa.width / 2,
                y: this.medusa.y + this.medusa.height,
                width: 10,
                height: 20,
                color: '#88ff44'
            });

            // Second Medusa snakes
            if (this.medusa2Active) {
                this.snakes.push({
                    x: this.medusa2.x + this.medusa2.width / 2,
                    y: this.medusa2.y + this.medusa2.height,
                    width: 10,
                    height: 20,
                    color: '#88ff44'
                });
            }

            // Third Medusa snakes
            if (this.medusa3Active) {
                this.snakes.push({
                    x: this.medusa3.x + this.medusa3.width / 2,
                    y: this.medusa3.y + this.medusa3.height,
                    width: 10,
                    height: 20,
                    color: '#88ff44'
                });
            }
        }

        // Update snakes
        for (let i = this.snakes.length - 1; i >= 0; i--) {
            this.snakes[i].y += this.snakeSpeed;

            // Check collision with player
            if (this.checkCollision(this.snakes[i], this.player)) {
                this.gameOver = true;
            }

            // Remove snakes that are off screen
            if (this.snakes[i].y > this.canvas.height) {
                this.snakes.splice(i, 1);
                this.score++;
            }
        }

        // Update petrification attacks
        for (let i = this.petrificationAttacks.length - 1; i >= 0; i--) {
            const attack = this.petrificationAttacks[i];
            attack.y += this.snakeSpeed * 1.5; // Make it faster than snakes

            // Check collision with player
            if (this.checkCollision(attack, this.player)) {
                this.playerFrozen = true;
                this.freezeTimer = this.freezeDuration;
                this.petrificationAttacks.splice(i, 1);
            }

            // Remove attacks that are off screen
            if (attack.y > this.canvas.height) {
                this.petrificationAttacks.splice(i, 1);
            }
        }

        this.frameCount++;
    }

    checkCollision(rect1, rect2) {
        // If rect1 is a petrification attack (has a triangle flag)
        if (rect1.isTriangle) {
            // Use triangle collision detection
            const playerCenterX = rect2.x + rect2.width / 2;
            const playerCenterY = rect2.y + rect2.height / 2;
            
            // Check if player center is within triangle bounds
            return this.pointInTriangle(
                playerCenterX,
                playerCenterY,
                rect1.x - rect1.width / 2,
                rect1.y,
                rect1.x + rect1.width / 2,
                rect1.y,
                rect1.x,
                rect1.y + rect1.height
            );
        }
        
        // For the player (rect2), we need to adjust for centered position
        const playerLeft = rect2.x - rect2.width / 2;
        const playerRight = rect2.x + rect2.width / 2;
        const playerTop = rect2.y - rect2.height / 2;
        const playerBottom = rect2.y + rect2.height / 2;

        // For snakes/other objects (rect1), use their direct coordinates
        return rect1.x < playerRight &&
               rect1.x + rect1.width > playerLeft &&
               rect1.y < playerBottom &&
               rect1.y + rect1.height > playerTop;
    }

    pointInTriangle(px, py, x1, y1, x2, y2, x3, y3) {
        const area = Math.abs((x2-x1)*(y3-y1) - (x3-x1)*(y2-y1))/2;
        const a = Math.abs((x1-px)*(y2-py) - (x2-px)*(y1-py))/2;
        const b = Math.abs((x2-px)*(y3-py) - (x3-px)*(y2-py))/2;
        const c = Math.abs((x3-px)*(y1-py) - (x1-px)*(y3-py))/2;
        return Math.abs(area - (a + b + c)) < 0.1;
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw player (Perseus) with frozen effect
        if (this.perseusImageLoaded) {
            // If frozen, apply a blue tint
            if (this.playerFrozen) {
                this.ctx.globalAlpha = 0.5;
                this.ctx.fillStyle = '#88ccff';
                this.ctx.fillRect(
                    this.player.x - this.player.width / 2,
                    this.player.y - this.player.height / 2,
                    this.player.width,
                    this.player.height
                );
                this.ctx.globalAlpha = 1.0;
            }
            
            this.ctx.drawImage(
                this.perseusImage,
                this.player.x - this.player.width / 2,
                this.player.y - this.player.height / 2,
                this.player.width,
                this.player.height
            );
        } else {
            // Fallback to rectangle if image hasn't loaded
            this.ctx.fillStyle = this.playerFrozen ? '#88ccff' : this.player.color;
            this.ctx.fillRect(
                this.player.x - this.player.width / 2,
                this.player.y - this.player.height / 2,
                this.player.width,
                this.player.height
            );
        }

        // Draw first Medusa
        if (this.medusaImageLoaded) {
            this.ctx.drawImage(
                this.medusaImage,
                this.medusa.x,
                this.medusa.y,
                this.medusa.width,
                this.medusa.height
            );
        } else {
            this.ctx.fillStyle = this.medusa.color;
            this.ctx.fillRect(
                this.medusa.x,
                this.medusa.y,
                this.medusa.width,
                this.medusa.height
            );
        }

        // Draw second Medusa if active
        if (this.medusa2Active) {
            if (this.medusaImageLoaded) {
                this.ctx.drawImage(
                    this.medusaImage,
                    this.medusa2.x,
                    this.medusa2.y,
                    this.medusa2.width,
                    this.medusa2.height
                );
            } else {
                this.ctx.fillStyle = this.medusa2.color;
                this.ctx.fillRect(
                    this.medusa2.x,
                    this.medusa2.y,
                    this.medusa2.width,
                    this.medusa2.height
                );
            }
        }

        // Draw third Medusa if active
        if (this.medusa3Active) {
            if (this.medusaImageLoaded) {
                this.ctx.drawImage(
                    this.medusaImage,
                    this.medusa3.x,
                    this.medusa3.y,
                    this.medusa3.width,
                    this.medusa3.height
                );
            } else {
                this.ctx.fillStyle = this.medusa3.color;
                this.ctx.fillRect(
                    this.medusa3.x,
                    this.medusa3.y,
                    this.medusa3.width,
                    this.medusa3.height
                );
            }
        }

        // Draw snakes
        this.snakes.forEach(snake => {
            this.ctx.fillStyle = snake.color;
            this.ctx.fillRect(snake.x, snake.y, snake.width, snake.height);
        });

        // Draw petrification attacks
        this.petrificationAttacks.forEach(attack => {
            this.ctx.fillStyle = attack.color;
            // Draw as triangle
            this.ctx.beginPath();
            this.ctx.moveTo(attack.x - attack.width / 2, attack.y);
            this.ctx.lineTo(attack.x + attack.width / 2, attack.y);
            this.ctx.lineTo(attack.x, attack.y + attack.height);
            this.ctx.closePath();
            this.ctx.fill();
        });

        // Draw score
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Score: ${this.score}`, 10, 30);

        // Draw game over message
        if (this.gameOver) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Press R to restart', this.canvas.width / 2, this.canvas.height / 2 + 40);
            this.ctx.textAlign = 'left';
        }

        // Add frozen status indicator
        if (this.playerFrozen) {
            this.ctx.fillStyle = '#88ccff';
            this.ctx.font = '20px Arial';
            this.ctx.fillText('FROZEN!', 10, 60);
        }
    }

    gameLoop(timeStamp) {
        // Calculate delta time
        if (!this.lastTimeStamp) {
            this.lastTimeStamp = timeStamp;
            this.nextPetrificationTime = this.getNextPetrificationTime();
        }
        const deltaTime = timeStamp - this.lastTimeStamp;
        this.lastTimeStamp = timeStamp;

        if (!this.gameOver) {  // Only spawn attacks if game is not over
            // Update next petrification time
            this.nextPetrificationTime -= deltaTime;

            // Check if it's time for a petrification attack
            if (this.nextPetrificationTime <= 0) {
                // Randomly choose which Medusa will attack
                let attackingMedusa = this.medusa;
                if (this.medusa3Active) {
                    // If third Medusa is active, randomly choose between all three
                    const rand = Math.random();
                    if (rand < 0.33) {
                        attackingMedusa = this.medusa;
                    } else if (rand < 0.66) {
                        attackingMedusa = this.medusa2;
                    } else {
                        attackingMedusa = this.medusa3;
                    }
                } else if (this.medusa2Active) {
                    // If only second Medusa is active, 50/50 chance between first two
                    attackingMedusa = Math.random() < 0.5 ? this.medusa2 : this.medusa;
                }

                this.petrificationAttacks.push({
                    x: attackingMedusa.x + attackingMedusa.width / 2,
                    y: attackingMedusa.y + attackingMedusa.height,
                    width: this.player.width,
                    height: this.player.height * 3,
                    color: '#888888',
                    isTriangle: true
                });
                this.nextPetrificationTime = this.getNextPetrificationTime();
            }
        }

        this.update();
        this.draw();
        requestAnimationFrame(this.gameLoop.bind(this));
    }
}

// Start the game when the page loads
window.onload = () => {
    new Game();
};


















