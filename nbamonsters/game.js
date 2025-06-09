class Game {
    constructor() {
        console.log('Game constructor called');
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // Game state
        this.players = [];
        this.ball = null;
        this.hoops = [];
        this.shotPower = 0;
        this.maxShotPower = 100;
        this.shotInProgress = false;
        this.ballVelocity = { x: 0, y: 0 };
        this.gravity = 0.5;
        this.passInProgress = false;
        this.passTarget = null;
        this.passVelocity = { x: 0, y: 0 };
        this.passSpeed = 10;
        this.currentPlayerIndex = 0;
        this.stealCooldown = 0;
        this.stealCooldownTime = 30;
        this.stealRange = 40;
        this.stealProtectionCooldown = 0;
        this.stealProtectionTime = 60; // 1 second at 60fps
        this.aiUpdateCounter = 0;
        this.aiUpdateFrequency = 3; // Update AI more frequently
        this.aiDecisionTimer = 0;
        this.aiDecisionDelay = 30; // Make decisions more frequently
        this.aiShootThreshold = 0.8; // Increased shooting tendency
        this.aiPassThreshold = 0.4; // Reduced passing tendency
        this.aiStealThreshold = 0.3;
        this.moveSpeed = 5;
        this.aiMoveSpeed = 8; // AI moves faster than human players
        this.aiShotPower = 0.7; // AI shot power multiplier

        // Movement state
        this.movingLeft = false;
        this.movingRight = false;
        this.movingUp = false;
        this.movingDown = false;
        
        // Initialize game
        this.init();
        
        // Start game loop
        this.gameLoop();
    }
    
    init() {
        console.log('Game init called');
        // Initialize players with AI flags
        this.players = [
            // Player 1 team (human controlled)
            { x: 200, y: 300, team: 1, hasBall: true, color: '#ff4444', isAI: false },
            { x: 150, y: 250, team: 1, hasBall: false, color: '#ff4444', isAI: false },
            // Player 2 team (AI controlled)
            { x: 600, y: 300, team: 2, hasBall: false, color: '#4444ff', isAI: true },
            { x: 650, y: 250, team: 2, hasBall: false, color: '#4444ff', isAI: true }
        ];
        
        // Initialize ball
        this.ball = {
            x: 200,
            y: 300,
            radius: 10,
            color: '#ffffff',
            inAir: false
        };

        // Initialize hoops at the middle of each end
        this.hoops = [
            { x: 50, y: 250, width: 80, height: 60, team: 1 },  // Left hoop
            { x: 670, y: 250, width: 80, height: 60, team: 2 }  // Right hoop
        ];
        
        // Set up input handlers
        document.addEventListener('keydown', (e) => {
            console.log('Key pressed:', e.key);
            switch(e.key.toLowerCase()) {
                case 'arrowleft':
                case 'a':
                    console.log('Moving left');
                    this.movingLeft = true;
                    break;
                case 'arrowright':
                case 'd':
                    console.log('Moving right');
                    this.movingRight = true;
                    break;
                case 'arrowup':
                case 'w':
                    console.log('Moving up');
                    this.movingUp = true;
                    break;
                case 'arrowdown':
                case 's':
                    console.log('Moving down');
                    this.movingDown = true;
                    break;
                case ' ':
                    console.log('Space pressed');
                    if (!this.shotInProgress) {
                        this.startShot();
                    }
                    break;
                case 'n':
                    console.log('N pressed');
                    if (!this.passInProgress && !this.shotInProgress) {
                        const currentPlayer = this.players[this.currentPlayerIndex];
                        if (currentPlayer.hasBall) {
                            this.startPass();
                        } else if (this.stealCooldown === 0) {
                            this.attemptSteal();
                        }
                    }
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            console.log('Key released:', e.key);
            switch(e.key.toLowerCase()) {
                case 'arrowleft':
                case 'a':
                    this.movingLeft = false;
                    break;
                case 'arrowright':
                case 'd':
                    this.movingRight = false;
                    break;
                case 'arrowup':
                case 'w':
                    this.movingUp = false;
                    break;
                case 'arrowdown':
                case 's':
                    this.movingDown = false;
                    break;
                case ' ':
                    if (this.shotInProgress) {
                        this.releaseShot();
                    }
                    break;
            }
        });
    }

    handlePlayerMovement(player) {
        // Calculate movement based on movement state
        let dx = 0;
        let dy = 0;

        if (this.movingLeft) dx -= this.moveSpeed;
        if (this.movingRight) dx += this.moveSpeed;
        if (this.movingUp) dy -= this.moveSpeed;
        if (this.movingDown) dy += this.moveSpeed;

        // Log movement if any direction is pressed
        if (dx !== 0 || dy !== 0) {
            console.log('Moving player:', { dx, dy, x: player.x, y: player.y });
        }

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const factor = 1 / Math.sqrt(2);
            dx *= factor;
            dy *= factor;
        }

        // Update player position
        player.x += dx;
        player.y += dy;

        // Keep player within canvas bounds
        player.x = Math.max(20, Math.min(this.canvas.width - 20, player.x));
        player.y = Math.max(20, Math.min(this.canvas.height - 20, player.y));
    }

    startShot() {
        if (!this.shotInProgress) {
            this.shotInProgress = true;
            this.shotPower = 0;
        }
    }

    releaseShot() {
        if (this.shotInProgress) {
            this.shotInProgress = false;
            
            // Get the current player
            const currentPlayer = this.players[this.currentPlayerIndex];
            
            // Calculate shot direction
            const targetHoop = this.hoops.find(h => h.team !== currentPlayer.team);
            const dx = targetHoop.x + targetHoop.width/2 - currentPlayer.x;
            const dy = targetHoop.y + targetHoop.height/2 - currentPlayer.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Calculate shot power based on distance and whether it's AI or human
            let powerMultiplier = 1;
            if (currentPlayer.isAI) {
                powerMultiplier = this.aiShotPower;
            }
            
            // Adjust power based on distance
            const distanceFactor = Math.min(distance / 400, 1); // Normalize distance
            const basePower = this.shotPower * powerMultiplier;
            const adjustedPower = basePower * (1 + distanceFactor * 0.5); // Increase power for longer shots
            
            // Set ball velocity
            this.ballVelocity = {
                x: (dx / distance) * adjustedPower * 0.1,
                y: (dy / distance) * adjustedPower * 0.1 - 5 // Add some arc to the shot
            };
            
            // Release the ball
            currentPlayer.hasBall = false;
            this.ball.inAir = true;
            this.ball.x = currentPlayer.x;
            this.ball.y = currentPlayer.y;
        }
    }

    startPass() {
        const currentPlayer = this.players[this.currentPlayerIndex];
        if (currentPlayer && currentPlayer.hasBall) {
            // Find teammate
            const teammate = this.players.find(p => p.team === currentPlayer.team && p !== currentPlayer);
            if (teammate) {
                this.passInProgress = true;
                this.passTarget = teammate;
                
                // Calculate pass direction
                const dx = teammate.x - currentPlayer.x;
                const dy = teammate.y - currentPlayer.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Set pass velocity
                this.passVelocity.x = (dx / distance) * this.passSpeed;
                this.passVelocity.y = (dy / distance) * this.passSpeed;
                
                // Release ball from current player
                currentPlayer.hasBall = false;
                this.ball.inAir = true;
            }
        }
    }

    attemptSteal() {
        // Get the current player attempting the steal
        const stealingPlayer = this.players[this.currentPlayerIndex];
        
        // Find the player with the ball
        const playerWithBall = this.players.find(p => p.hasBall);
        
        if (playerWithBall && playerWithBall.team !== stealingPlayer.team) {
            // Check if the player with the ball is protected from steals
            if (this.stealProtectionCooldown > 0) {
                return; // Can't steal during protection period
            }

            // Calculate distance to player with ball
            const dx = playerWithBall.x - stealingPlayer.x;
            const dy = playerWithBall.y - stealingPlayer.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check if in range
            if (distance < this.stealRange) {
                // 50% chance to steal
                if (Math.random() < 0.5) {
                    // Successful steal
                    playerWithBall.hasBall = false;
                    stealingPlayer.hasBall = true;
                    this.ball.x = stealingPlayer.x;
                    this.ball.y = stealingPlayer.y;
                    
                    // Create steal effect
                    this.stealEffect = {
                        x: stealingPlayer.x,
                        y: stealingPlayer.y,
                        radius: 30,
                        alpha: 1
                    };
                    
                    // Set cooldowns
                    this.stealCooldown = this.stealCooldownTime;
                    this.stealProtectionCooldown = this.stealProtectionTime;
                }
            }
        }
    }

    showStealEffect(x, y) {
        // Create a visual effect for successful steal
        this.stealEffect = {
            x: x,
            y: y,
            radius: 0,
            maxRadius: 30,
            alpha: 1
        };
    }
    
    updateAI() {
        this.aiUpdateCounter++;
        if (this.aiUpdateCounter >= this.aiUpdateFrequency) {
            this.aiUpdateCounter = 0;
            
            // Get human players
            const humanPlayers = this.players.filter(p => !p.isAI);
            const playerWithBall = humanPlayers.find(p => p.hasBall);
            const playerWithoutBall = humanPlayers.find(p => !p.hasBall);
            
            // Update AI players
            this.players.forEach((player, index) => {
                if (player.isAI) {
                    // Determine which AI player is the primary defender (ball pressure)
                    const isPrimaryDefender = index === 2; // First AI player (index 2) is primary defender
                    
                    if (isPrimaryDefender) {
                        // Primary defender: Pressure the ball handler
                        if (playerWithBall) {
                            const dx = playerWithBall.x - player.x;
                            const dy = playerWithBall.y - player.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            
                            // Move towards the ball handler
                            if (distance > 10) {
                                player.x += (dx / distance) * this.aiMoveSpeed;
                                player.y += (dy / distance) * this.aiMoveSpeed;
                            }
                            
                            // Try to steal if in range
                            if (distance < this.stealRange) {
                                // Store current player index
                                const originalPlayerIndex = this.currentPlayerIndex;
                                // Set current player to this AI player
                                this.currentPlayerIndex = index;
                                // Attempt steal
                                this.attemptSteal();
                                // Restore original player index
                                this.currentPlayerIndex = originalPlayerIndex;
                            }
                        }
                    } else {
                        // Secondary defender: Cover the player without the ball
                        if (playerWithoutBall) {
                            const dx = playerWithoutBall.x - player.x;
                            const dy = playerWithoutBall.y - player.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            
                            // Position between the player without the ball and the hoop
                            const targetHoop = this.hoops.find(h => h.team === player.team);
                            const targetX = (playerWithoutBall.x + targetHoop.x) / 2;
                            const targetY = (playerWithoutBall.y + targetHoop.y) / 2;
                            
                            const moveDx = targetX - player.x;
                            const moveDy = targetY - player.y;
                            const moveDistance = Math.sqrt(moveDx * moveDx + moveDy * moveDy);
                            
                            if (moveDistance > 10) {
                                player.x += (moveDx / moveDistance) * this.aiMoveSpeed;
                                player.y += (moveDy / moveDistance) * this.aiMoveSpeed;
                            }
                        }
                    }

                    // If we have the ball, decide whether to shoot or pass
                    if (player.hasBall) {
                        // Find the closest teammate
                        let closestTeammate = null;
                        let minTeammateDistance = Infinity;
                        
                        this.players.forEach(teammate => {
                            if (teammate.team === player.team && teammate !== player) {
                                const dx = teammate.x - player.x;
                                const dy = teammate.y - player.y;
                                const distance = Math.sqrt(dx * dx + dy * dy);
                                
                                if (distance < minTeammateDistance) {
                                    minTeammateDistance = distance;
                                    closestTeammate = teammate;
                                }
                            }
                        });

                        // Make decisions every few frames
                        this.aiDecisionTimer++;
                        if (this.aiDecisionTimer >= this.aiDecisionDelay) {
                            this.aiDecisionTimer = 0;
                            
                            // Calculate distance to hoop
                            const targetHoop = this.hoops.find(h => h.team !== player.team);
                            const dx = targetHoop.x - player.x;
                            const dy = targetHoop.y - player.y;
                            const distanceToHoop = Math.sqrt(dx * dx + dy * dy);
                            
                            // Move towards hoop more aggressively
                            if (distanceToHoop > 10) {
                                player.x += (dx / distanceToHoop) * this.aiMoveSpeed;
                                player.y += (dy / distanceToHoop) * this.aiMoveSpeed;
                            }
                            
                            // Decide whether to shoot or pass
                            const shouldShoot = distanceToHoop < 300 && Math.random() < this.aiShootThreshold;
                            const shouldPass = closestTeammate && 
                                             minTeammateDistance < 200 && 
                                             Math.random() < this.aiPassThreshold;
                            
                            if (shouldShoot) {
                                // Shoot
                                this.currentPlayerIndex = index;
                                this.startShot();
                                setTimeout(() => this.releaseShot(), 500);
                            } else if (shouldPass) {
                                // Pass to teammate
                                this.passTarget = closestTeammate;
                                this.passInProgress = true;
                                this.ball.inAir = true;
                                player.hasBall = false;
                                
                                // Calculate pass velocity
                                const passDx = closestTeammate.x - player.x;
                                const passDy = closestTeammate.y - player.y;
                                const passDistance = Math.sqrt(passDx * passDx + passDy * passDy);
                                this.passVelocity = {
                                    x: (passDx / passDistance) * this.passSpeed,
                                    y: (passDy / passDistance) * this.passSpeed
                                };
                            }
                        }
                    } else if (!isPrimaryDefender) {
                        // If we don't have the ball and we're not the primary defender,
                        // help with defense by staying between the ball and our hoop
                        if (this.ball.inAir) {
                            // If ball is in air, try to get under it
                            const dx = this.ball.x - player.x;
                            const dy = this.ball.y - player.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            
                            if (distance > 10) {
                                player.x += (dx / distance) * this.aiMoveSpeed;
                                player.y += (dy / distance) * this.aiMoveSpeed;
                            }
                        }
                    }
                }
            });
        }
    }

    update() {
        // Get the current player we're controlling
        const currentPlayer = this.players[this.currentPlayerIndex];
        
        // Handle movement for human players
        if (currentPlayer && !currentPlayer.isAI) {
            this.handlePlayerMovement(currentPlayer);
            
            // Update ball position to follow player if they have it
            if (currentPlayer.hasBall) {
                this.ball.x = currentPlayer.x;
                this.ball.y = currentPlayer.y;

                // Update shot power while space is held
                if (this.shotInProgress) {
                    this.shotPower = Math.min(this.shotPower + 2, this.maxShotPower);
                }
            }
        }

        // Update AI
        this.updateAI();

        // Update ball physics when in air
        if (this.ball.inAir) {
            if (this.passInProgress) {
                // Update pass position
                this.ball.x += this.passVelocity.x;
                this.ball.y += this.passVelocity.y;

                // Check if ball reached target
                if (this.passTarget) {
                    const dx = this.passTarget.x - this.ball.x;
                    const dy = this.passTarget.y - this.ball.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < 30) { // Ball reached target
                        this.passTarget.hasBall = true;
                        this.ball.inAir = false;
                        this.passInProgress = false;
                        
                        // Switch control to the receiving player if they're on our team
                        if (!this.passTarget.isAI) {
                            const newPlayerIndex = this.players.indexOf(this.passTarget);
                            if (newPlayerIndex !== -1) {
                                this.currentPlayerIndex = newPlayerIndex;
                            }
                        }
                        
                        this.passTarget = null;
                        this.ball.x = this.players[this.currentPlayerIndex].x;
                        this.ball.y = this.players[this.currentPlayerIndex].y;
                        
                        // Set steal protection when receiving a pass
                        this.stealProtectionCooldown = this.stealProtectionTime;
                    }
                }
            } else {
                // Regular shot physics
                this.ball.x += this.ballVelocity.x;
                this.ball.y += this.ballVelocity.y;
                this.ballVelocity.y += this.gravity;

                // Check for collisions with hoops
                this.hoops.forEach(hoop => {
                    if (this.checkHoopCollision(hoop)) {
                        // Ball went through hoop
                        this.resetBall();
                    }
                });

                // Check for floor collision
                if (this.ball.y > this.canvas.height - this.ball.radius) {
                    this.resetBall();
                }
            }
        }

        // Update cooldowns
        if (this.stealCooldown > 0) {
            this.stealCooldown--;
        }
        if (this.stealProtectionCooldown > 0) {
            this.stealProtectionCooldown--;
        }

        // Update steal effect
        if (this.stealEffect) {
            this.stealEffect.radius += 2;
            this.stealEffect.alpha -= 0.05;
            if (this.stealEffect.alpha <= 0) {
                this.stealEffect = null;
            }
        }
    }

    checkHoopCollision(hoop) {
        return (
            this.ball.x > hoop.x &&
            this.ball.x < hoop.x + hoop.width &&
            this.ball.y > hoop.y &&
            this.ball.y < hoop.y + hoop.height
        );
    }

    resetBall() {
        this.ball.inAir = false;
        this.ballVelocity = { x: 0, y: 0 };
        // Give ball to nearest player
        const nearestPlayer = this.players.reduce((nearest, player) => {
            const dx = player.x - this.ball.x;
            const dy = player.y - this.ball.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < nearest.distance ? { player, distance } : nearest;
        }, { player: null, distance: Infinity }).player;
        
        if (nearestPlayer) {
            nearestPlayer.hasBall = true;
            this.ball.x = nearestPlayer.x;
            this.ball.y = nearestPlayer.y;
            // Switch control to the player who got the ball if they're on our team
            if (!nearestPlayer.isAI) {
                this.currentPlayerIndex = this.players.indexOf(nearestPlayer);
            }
        }
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw court
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(50, 50, this.canvas.width - 100, this.canvas.height - 100);
        
        // Draw center line
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 50);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height - 50);
        this.ctx.stroke();
        
        // Draw hoops
        this.hoops.forEach(hoop => {
            // Draw backboard
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(hoop.x, hoop.y, hoop.width, hoop.height);
            
            // Draw rim
            this.ctx.beginPath();
            this.ctx.arc(hoop.x + hoop.width/2, hoop.y + hoop.height/2, 15, 0, Math.PI * 2);
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        });
        
        // Draw players
        this.players.forEach((player, index) => {
            this.ctx.fillStyle = player.color;
            this.ctx.beginPath();
            this.ctx.arc(player.x, player.y, 20, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw selection indicator for current player
            if (index === this.currentPlayerIndex) {
                this.ctx.strokeStyle = '#ffff00';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(player.x, player.y, 25, 0, Math.PI * 2);
                this.ctx.stroke();
            }

            // Draw steal protection indicator
            if (player.hasBall && this.stealProtectionCooldown > 0) {
                this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(player.x, player.y, 30, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        });
        
        // Draw ball
        this.ctx.fillStyle = this.ball.color;
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw shot power meter when shooting
        if (this.shotInProgress) {
            const meterWidth = 100;
            const meterHeight = 10;
            const meterX = this.canvas.width / 2 - meterWidth / 2;
            const meterY = this.canvas.height - 50;
            
            // Background
            this.ctx.fillStyle = '#666666';
            this.ctx.fillRect(meterX, meterY, meterWidth, meterHeight);
            
            // Power level
            this.ctx.fillStyle = '#00ff00';
            this.ctx.fillRect(meterX, meterY, (this.shotPower / this.maxShotPower) * meterWidth, meterHeight);
        }
        
        // Draw steal effect
        if (this.stealEffect) {
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${this.stealEffect.alpha})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(this.stealEffect.x, this.stealEffect.y, this.stealEffect.radius, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }
    
    gameLoop() {
        console.log('Game loop running');
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when the page loads
window.onload = () => {
    console.log('Window loaded, starting game');
    new Game();
}; 