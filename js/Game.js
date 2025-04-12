/**
 * Game class to manage the game state and logic
 */
class Game {
    constructor() {
        this.init();
        this.setupEventListeners();
        this.animate();
    }
    
    init() {
        // Initialize member variables
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75, window.innerWidth / window.innerHeight, 0.1, 1000
        );
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.getElementById('game-container').appendChild(this.renderer.domElement);
        
        // Game state
        this.score = 0;
        this.isGameOver = false;
        this.isPaused = false;
        this.difficulty = 1;
        this.enemySpawnTimer = 0;
        this.enemySpawnRate = 10000; // ms between enemy spawns
        this.maxEnemies = 5;
        this.lastFrameTime = Date.now();
        this.debris = []; // For explosion particles
        
        // Coin and power-up system
        this.coins = [];
        this.coinSpawnTimer = 0;
        this.coinSpawnRate = 1500; // Reduced from 2000ms to 1500ms - spawn coins more frequently
        this.maxCoins = 10;
        this.playerCoinCount = 0;
        this.totalCoinsCollected = 0; // Track total coins collected for power scaling
        this.powerUpActive = false;
        this.powerUpTimer = 0;
        this.powerUpDuration = 180000; // 3 minutes of power-up
        this.requiredCoinsForPowerUp = 5;
        this.powerLevel = 1; // Power level starts at 1 and increases as more coins are collected
        this.frame = 0; // Initialize frame counter
        
        console.log("Game initialization started");
        
        // Create UI elements
        this.createUI();
        this.createCrosshair();
        
        // Set up scene
        this.setupLights();
        this.createTerrain();
        this.createPlayer();
        this.enemies = [];
        
        // Mouse control variables
        this.mouseX = 0;
        this.mouseY = 0;
        
        // Lock pointer for FPS controls
        this.setupControls();
        
        // Make sure initial coins are spawned
        console.log("About to spawn the first coin");
        
        // Force immediate spawn of one coin
        setTimeout(() => {
            console.log("Spawning initial coin...");
            const coin1 = this.spawnCoin();
            
            if (coin1) {
                console.log("First coin created successfully");
            } else {
                console.error("Failed to create first coin!");
            }
            
            // Force multiple coins with delays to ensure there are multiple coins visible
            setTimeout(() => {
                console.log("Spawning second coin...");
                this.spawnCoin();
                
                setTimeout(() => {
                    console.log("Spawning third coin...");
                    this.spawnCoin();
                    
                    setTimeout(() => {
                        console.log("Spawning fourth coin...");
                        this.spawnCoin();
                        
                        // Extra safety to ensure coins are visible
                        setTimeout(() => {
                            // Log the current state of coins
                            console.log(`COIN DEBUG: After initial spawns - Coins in array: ${this.coins.length}`);
                            console.log(`COIN DEBUG: Visible coins: ${this.coins.filter(c => !c.isCollected).length}`);
                            
                            // If somehow we still don't have coins, try one more time with different positions
                            if (this.coins.length < 2) {
                                console.log("COIN DEBUG: Still insufficient coins after initial spawns, trying again with different logic");
                                this.forceSpawnCoinsAroundPlayer();
                            }
                        }, 1000);
                    }, 500);
                }, 500);
            }, 500);
        }, 500);
        
        console.log("Game initialization completed");
    }
    
    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x666666);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        
        // Configure shadow properties
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        
        this.scene.add(directionalLight);
    }
    
    createTerrain() {
        this.terrain = new Terrain(this.scene);
    }
    
    createPlayer() {
        this.player = new Tank(this.scene, true, this);
        
        // Position camera behind and above player's tank
        this.updateCamera();
    }
    
    createCrosshair() {
        const crosshair = document.createElement('div');
        crosshair.className = 'crosshair';
        document.getElementById('game-container').appendChild(crosshair);
    }
    
    setupControls() {
        // Set up pointer lock controls
        this.controls = new THREE.PointerLockControls(this.camera, document.body);
        
        // Event listener for clicking the game canvas to start
        document.addEventListener('click', () => {
            if (!this.controls.isLocked) {
                this.controls.lock();
                console.log("Attempting to lock pointer");
            }
        });
        
        // Event listeners for pointer lock changes
        document.addEventListener('pointerlockchange', () => {
            const startMessage = document.getElementById('start-message');
            
            if (document.pointerLockElement === document.body) {
                console.log("Pointer locked - game unpaused");
                this.isPaused = false;
                
                // Hide the start message when game starts
                if (startMessage) startMessage.style.display = 'none';
            } else {
                console.log("Pointer unlocked - game paused");
                this.isPaused = true;
                
                // Show the start message again when game is paused
                if (startMessage) startMessage.style.display = 'block';
            }
        });
        
        document.addEventListener('pointerlockerror', () => {
            console.error("Error locking pointer - browser may be blocking pointer lock");
            alert("Click the game again to enable controls. If controls still don't work, please try using a different browser or check your browser settings.");
        });
    }
    
    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (event) => this.handleKeyDown(event));
        document.addEventListener('keyup', (event) => this.handleKeyUp(event));
        
        // Mouse movement for turret rotation
        document.addEventListener('mousemove', (event) => this.handleMouseMove(event));
        
        // Mouse click for firing
        document.addEventListener('mousedown', (event) => this.handleMouseDown(event));
        
        // Window resize handler
        window.addEventListener('resize', () => this.handleResize());
        
        // Restart button
        document.getElementById('restart-button').addEventListener('click', () => this.restartGame());
    }
    
    handleKeyDown(event) {
        // Game over check still applies to all controls
        if (this.isGameOver) return;
        
        // Special case for arrow keys - allow them to work even when paused
        if (event.code === 'ArrowUp' || event.code === 'ArrowDown' || 
            event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
            
            // If game is paused but we're using arrow keys, unpause temporarily for movement
            if (this.isPaused) {
                console.log("Arrow key pressed while paused - allowing movement");
                // Don't fully unpause, just allow this specific movement
            }
            
            switch (event.code) {
                case 'ArrowUp':
                    this.player.movement.forward = true;
                    break;
                case 'ArrowDown':
                    this.player.movement.backward = true;
                    break;
                case 'ArrowLeft':
                    this.player.movement.left = true;
                    break;
                case 'ArrowRight':
                    this.player.movement.right = true;
                    break;
            }
            return;
        }
        
        // For all other keys, check if game is paused
        if (this.isPaused) return;
        
        switch (event.code) {
            case 'KeyW':
                this.player.movement.forward = true;
                break;
            case 'KeyS':
                this.player.movement.backward = true;
                break;
            case 'KeyA':
                this.player.movement.left = true;
                break;
            case 'KeyD':
                this.player.movement.right = true;
                break;
            case 'KeyQ':
                this.player.movement.turretLeft = true;
                break;
            case 'KeyE':
                this.player.movement.turretRight = true;
                break;
            case 'Space':
                // Fire when space key is pressed
                this.player.fire();
                break;
            case 'Escape':
                this.togglePause();
                break;
        }
    }
    
    handleKeyUp(event) {
        if (this.isGameOver) return;
        
        // Special case for arrow keys
        if (event.code === 'ArrowUp' || event.code === 'ArrowDown' || 
            event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
            
            switch (event.code) {
                case 'ArrowUp':
                    this.player.movement.forward = false;
                    break;
                case 'ArrowDown':
                    this.player.movement.backward = false;
                    break;
                case 'ArrowLeft':
                    this.player.movement.left = false;
                    break;
                case 'ArrowRight':
                    this.player.movement.right = false;
                    break;
            }
            return;
        }
        
        // For all other keys, check if game is paused
        if (this.isPaused) return;
        
        switch (event.code) {
            case 'KeyW':
                this.player.movement.forward = false;
                break;
            case 'KeyS':
                this.player.movement.backward = false;
                break;
            case 'KeyA':
                this.player.movement.left = false;
                break;
            case 'KeyD':
                this.player.movement.right = false;
                break;
            case 'KeyQ':
                this.player.movement.turretLeft = false;
                break;
            case 'KeyE':
                this.player.movement.turretRight = false;
                break;
        }
    }
    
    handleMouseMove(event) {
        if (this.isGameOver || this.isPaused || !this.controls.isLocked) return;
        
        // Use mouse movement to rotate the turret
        // This is a simple implementation, in a more advanced game
        // we might use raycasting to aim at the point on the ground
        // that the player is looking at
        
        // For now we'll just use x-axis movement to rotate the turret
        if (event.movementX > 5) {
            this.player.turret.rotateY(-0.03);
            this.player.cannon.rotateY(-0.03);
        } else if (event.movementX < -5) {
            this.player.turret.rotateY(0.03);
            this.player.cannon.rotateY(0.03);
        }
    }
    
    handleMouseDown(event) {
        if (this.isGameOver || this.isPaused || !this.controls.isLocked) return;
        
        // Left mouse button
        if (event.button === 0) {
            this.player.fire();
        }
    }
    
    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    togglePause() {
        if (this.isGameOver) return;
        
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            if (this.controls.isLocked) {
                this.controls.unlock();
            }
        } else {
            if (!this.controls.isLocked) {
                this.controls.lock();
            }
        }
    }
    
    spawnEnemy() {
        if (this.enemies.length >= this.maxEnemies) return;
        
        const enemy = new Enemy(this.scene, Math.min(this.difficulty, 5), this);
        
        // Give the enemy access to the terrain for obstacle detection
        enemy.setTerrain(this.terrain);
        
        this.enemies.push(enemy);
        
        // Reset spawn timer
        this.enemySpawnTimer = 0;
    }
    
    updateEnemies(deltaTime) {
        // Update existing enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // Update enemy
            enemy.update(deltaTime, this.player);
            
            // Check if enemy is destroyed
            if (enemy.isDestroyed) {
                this.score += enemy.score;
                document.getElementById('score-value').textContent = this.score;
                
                // Remove from array
                this.enemies.splice(i, 1);
                
                // Increase difficulty based on score
                this.difficulty = Math.floor(this.score / 500) + 1;
            }
        }
        
        // Spawn new enemies
        this.enemySpawnTimer += deltaTime * 1000;
        if (this.enemySpawnTimer > this.enemySpawnRate) {
            this.spawnEnemy();
        }
    }
    
    checkCollisions() {
        // Simple collision checks
        
        // Player projectiles with enemies
        if (!this.player.isDestroyed) {
            for (let i = this.player.projectiles.length - 1; i >= 0; i--) {
                const projectile = this.player.projectiles[i];
                
                // Skip already marked projectiles
                if (projectile.shouldRemove) continue;
                
                for (const enemy of this.enemies) {
                    if (!enemy.isDestroyed && checkCollision(projectile, enemy)) {
                        enemy.takeDamage(projectile.damage);
                        projectile.explode();
                        projectile.shouldRemove = true;
                        console.log("Player projectile hit enemy!");
                        break; // Stop checking this projectile against other enemies
                    }
                }
            }
        }
        
        // Enemy projectiles with player
        if (!this.player.isDestroyed) {
            for (const enemy of this.enemies) {
                for (let i = enemy.projectiles.length - 1; i >= 0; i--) {
                    const projectile = enemy.projectiles[i];
                    
                    // Skip already marked projectiles
                    if (projectile.shouldRemove) continue;
                    
                    if (checkCollision(projectile, this.player)) {
                        const remainingHealth = this.player.takeDamage(projectile.damage);
                        document.getElementById('health-value').textContent = Math.max(0, remainingHealth);
                        
                        projectile.explode();
                        projectile.shouldRemove = true;
                        console.log("Enemy projectile hit player!");
                        
                        if (this.player.isDestroyed) {
                            this.gameOver();
                        }
                        break; // Stop checking this projectile
                    }
                }
            }
        }
        
        // Tank-to-tank collisions
        
        // Player-enemy tank collisions
        if (!this.player.isDestroyed) {
            const playerPreviousPos = this.previousPlayerPosition || this.player.position.clone();
            
            for (const enemy of this.enemies) {
                if (enemy.isDestroyed) continue;
                
                if (checkCollision(this.player, enemy)) {
                    // Push player back to previous position
                    this.player.tank.position.copy(playerPreviousPos);
                    
                    // Push enemy slightly away from player
                    const pushDirection = new THREE.Vector3()
                        .subVectors(enemy.position, this.player.position)
                        .normalize()
                        .multiplyScalar(0.5);
                    
                    enemy.tank.position.add(pushDirection);
                }
            }
            
            // Remember position for next frame if not already set elsewhere
            if (!this.previousPlayerPosition) {
                this.previousPlayerPosition = this.player.position.clone();
            }
        }
        
        // Enemy-enemy tank collisions
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy1 = this.enemies[i];
            if (enemy1.isDestroyed) continue;
            
            for (let j = i + 1; j < this.enemies.length; j++) {
                const enemy2 = this.enemies[j];
                if (enemy2.isDestroyed) continue;
                
                if (checkCollision(enemy1, enemy2)) {
                    // Push enemies away from each other
                    const pushDirection = new THREE.Vector3()
                        .subVectors(enemy1.position, enemy2.position)
                        .normalize()
                        .multiplyScalar(0.5);
                    
                    enemy1.tank.position.add(pushDirection);
                    enemy2.tank.position.add(pushDirection.clone().negate());
                    
                    // Adjust patrol directions
                    enemy1.patrolDirection.negate();
                    enemy2.patrolDirection.negate();
                    enemy1.lastPatrolChange = Date.now();
                    enemy2.lastPatrolChange = Date.now();
                }
            }
        }
        
        // Check terrain collisions for tanks and projectiles
        // (simplified implementation)
        
        // Player-terrain collisions
        if (!this.player.isDestroyed) {
            const collisionResult = this.terrain.checkCollision(this.player);
            
            if (collisionResult.collided) {
                if (collisionResult.type === 'boundary') {
                    // Create a visual effect to indicate boundary collision
                    this.showBoundaryWarning();
                    
                    // Keep player within boundaries using the terrain helper
                    this.terrain.keepWithinBoundaries(this.player);
                    
                    // Play sound effect (if implemented)
                    // this.playBoundaryCollisionSound();
                } else if (collisionResult.type === 'obstacle') {
                    // Use the new obstacle collision handler for smoother resolution
                    if (this.terrain.handleObstacleCollision(this.player, collisionResult.obstacle)) {
                        // If collision was resolved, show visual feedback and play sound
                        this.showObstacleWarning();
                        // Play collision sound
                        this.player.playCollisionSound();
                        // Create impact particles
                        this.createImpactParticles(this.player.position.clone());
                    } else {
                        // Fallback: restore previous position
                        this.player.tank.position.copy(this.previousPlayerPosition);
                        // Play collision sound
                        this.player.playCollisionSound();
                        // Create impact particles
                        this.createImpactParticles(this.player.position.clone());
                    }
                }
            }
            
            // Remember current position for next frame
            this.previousPlayerPosition = this.player.position.clone();
        }
        
        // Enemy-terrain collisions
        for (const enemy of this.enemies) {
            if (enemy.isDestroyed) continue;
            
            // Store the previous position before checking for collisions
            if (!enemy.previousPosition) {
                enemy.previousPosition = enemy.position.clone();
            }
            
            const collisionResult = this.terrain.checkCollision(enemy);
            
            if (collisionResult.collided) {
                if (collisionResult.type === 'boundary') {
                    // Keep enemy within boundaries
                    this.terrain.keepWithinBoundaries(enemy);
                    
                    // Change patrol direction to move away from boundary
                    enemy.patrolDirection.copy(collisionResult.direction);
                    enemy.lastPatrolChange = Date.now();
                } else if (collisionResult.type === 'obstacle') {
                    // Try using the new obstacle collision handler first
                    if (!this.terrain.handleObstacleCollision(enemy, collisionResult.obstacle)) {
                        // Fallback: restore previous position
                        enemy.tank.position.copy(enemy.previousPosition);
                    }
                    
                    // Create impact particles for enemy collisions too (but only if player is nearby to see it)
                    if (distance(enemy.position, this.player.position) < 30) {
                        this.createImpactParticles(enemy.position.clone());
                    }
                    
                    // Change patrol direction away from obstacle
                    const directionToObstacle = new THREE.Vector3()
                        .subVectors(collisionResult.obstacle.position, enemy.position)
                        .normalize();
                    
                    // Set patrol direction away from the obstacle
                    enemy.patrolDirection.copy(directionToObstacle).negate();
                    enemy.lastPatrolChange = Date.now();
                    
                    // Add a small random variation to direction to avoid getting stuck
                    enemy.patrolDirection.x += (Math.random() - 0.5) * 0.3;
                    enemy.patrolDirection.z += (Math.random() - 0.5) * 0.3;
                    enemy.patrolDirection.normalize();
                }
            }
            
            // Remember current position for next frame
            enemy.previousPosition = enemy.position.clone();
        }
        
        // Projectile-terrain collisions
        // Player projectiles
        for (const projectile of this.player.projectiles) {
            const collisionResult = this.terrain.checkCollision(projectile);
            if (collisionResult.collided) {
                projectile.explode();
                projectile.shouldRemove = true;
                
                // Log collision for debugging
                console.log("Player projectile hit terrain:", collisionResult.type);
            }
        }
        
        // Enemy projectiles
        for (const enemy of this.enemies) {
            for (const projectile of enemy.projectiles) {
                const collisionResult = this.terrain.checkCollision(projectile);
                if (collisionResult.collided) {
                    projectile.explode();
                    projectile.shouldRemove = true;
                    
                    // Log collision for debugging
                    console.log("Enemy projectile hit terrain:", collisionResult.type);
                }
            }
        }
    }
    
    updateCamera() {
        if (this.player.isDestroyed) return;
        
        // Position camera relative to tank
        // This is a third-person view - for first-person would need different approach
        const cameraOffset = new THREE.Vector3(0, 7, -12);
        cameraOffset.applyQuaternion(this.player.tank.quaternion);
        
        const cameraTarget = new THREE.Vector3();
        cameraTarget.copy(this.player.position).add(cameraOffset);
        
        this.camera.position.copy(cameraTarget);
        
        // Look at the tank
        const lookAtPosition = this.player.position.clone();
        lookAtPosition.y += 2; // Look slightly above the tank
        this.camera.lookAt(lookAtPosition);
        
        // Log camera position occasionally (helpful for debugging)
        if (Math.random() < 0.01) {
            console.log("Camera position:", this.camera.position.clone());
            console.log("Looking at:", lookAtPosition);
            console.log("Player position:", this.player.position.clone());
        }
    }
    
    updateUI() {
        // Update health display
        document.getElementById('health-value').textContent = Math.max(0, this.player.health);
        
        // Update score display
        document.getElementById('score-value').textContent = this.score;
        
        // Update the coin counter if it exists
        const coinDisplay = document.getElementById('coin-display');
        if (coinDisplay) {
            coinDisplay.textContent = `Coins: ${this.playerCoinCount}/${this.requiredCoinsForPowerUp}`;
        }
        
        // Update power level display if it exists
        const powerLevelDisplay = document.getElementById('power-level');
        if (powerLevelDisplay) {
            powerLevelDisplay.textContent = `Power: ${this.powerLevel}x`;
        } else {
            // Create power level display if it doesn't exist
            this.createPowerLevelDisplay();
        }
        
        // Update health bonus progress if it exists
        const healthBonusDisplay = document.getElementById('health-bonus');
        if (healthBonusDisplay) {
            // Calculate progress to next health bonus (every 100 coins)
            const progress = this.totalCoinsCollected % 100;
            const remaining = 100 - progress;
            healthBonusDisplay.textContent = `Health Bonus: ${progress}/100`;
            
            // Update progress bar if it exists
            const progressBar = document.getElementById('health-bonus-progress');
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
                
                // Change color as it gets closer to 100
                if (progress > 90) {
                    progressBar.style.backgroundColor = '#00FF00'; // Bright green when close
                } else if (progress > 70) {
                    progressBar.style.backgroundColor = '#AAFF00'; // Yellow-green
                } else if (progress > 50) {
                    progressBar.style.backgroundColor = '#FFAA00'; // Orange
                } else {
                    progressBar.style.backgroundColor = '#FF5500'; // Reddish
                }
            }
            
            // Add pulsing animation when close to health bonus
            const container = document.getElementById('health-bonus-container');
            if (container) {
                if (progress > 90) {
                    container.classList.add('pulse');
                } else {
                    container.classList.remove('pulse');
                }
            }
        } else {
            // Create health bonus display if it doesn't exist
            this.createHealthBonusDisplay();
        }
        
        // Update power-up indicator
        this.updatePowerUpIndicator();
    }
    
    createPowerLevelDisplay() {
        // Create the power level display container
        const powerLevelDisplay = document.createElement('div');
        powerLevelDisplay.id = 'power-level';
        powerLevelDisplay.className = 'ui-element power-level';
        powerLevelDisplay.textContent = `Power: ${this.powerLevel}x`;
        
        // Add to the game UI container instead of game-container
        const uiContainer = document.getElementById('game-ui');
        if (uiContainer) {
            uiContainer.appendChild(powerLevelDisplay);
        } else {
            document.getElementById('game-container').appendChild(powerLevelDisplay);
        }
    }
    
    updatePowerUpIndicator() {
        // Find or create the power-up indicator
        let powerUpIndicator = document.getElementById('power-up-indicator');
        
        if (!powerUpIndicator) {
            powerUpIndicator = document.createElement('div');
            powerUpIndicator.id = 'power-up-indicator';
            powerUpIndicator.className = 'ui-element power-up-indicator';
            document.getElementById('game-container').appendChild(powerUpIndicator);
        }
        
        // Show/hide and update the indicator based on power-up state
        if (this.powerUpActive) {
            powerUpIndicator.style.display = 'block';
            
            // Calculate remaining time in minutes and seconds
            const remainingMilliseconds = this.powerUpDuration - (Date.now() - this.powerUpTimer);
            const remainingMinutes = Math.floor(remainingMilliseconds / 60000);
            const remainingSeconds = Math.ceil((remainingMilliseconds % 60000) / 1000);
            
            // Format time as MM:SS
            const formattedTime = `${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}`;
            
            // Set the color based on power level (yellower to redder)
            const powerRatio = (this.powerLevel - 1) / 9; // 0 to 1 scale
            const r = 255;
            const g = Math.round(255 * (1 - powerRatio * 0.8));
            const b = 0;
            
            powerUpIndicator.style.backgroundColor = `rgb(${r}, ${g}, ${b}, 0.8)`;
            powerUpIndicator.style.borderColor = `rgb(${r}, ${g}, ${b})`;
            
            powerUpIndicator.textContent = `POWER UP ACTIVE (Level ${this.powerLevel}x) - ${formattedTime}`;
        } else {
            powerUpIndicator.style.display = 'none';
        }
    }
    
    gameOver() {
        this.isGameOver = true;
        
        // Update UI
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('game-over').classList.remove('hidden');
        
        // Release pointer lock
        if (this.controls.isLocked) {
            this.controls.unlock();
        }
    }
    
    restartGame() {
        // Deactivate any active power-up
        this.deactivatePowerUp();
        
        // Reset game state
        this.score = 0;
        this.isGameOver = false;
        this.difficulty = 1;
        this.playerCoinCount = 0;
        
        // Reset player
        this.player.reset();
        
        // Remove all enemies
        for (const enemy of this.enemies) {
            this.scene.remove(enemy.tank);
        }
        this.enemies = [];
        
        // Remove all coins
        for (const coin of this.coins) {
            coin.remove();
        }
        this.coins = [];
        
        // Reset UI
        document.getElementById('score-value').textContent = '0';
        document.getElementById('health-value').textContent = '100';
        document.getElementById('game-over').classList.add('hidden');
        
        // Lock pointer again
        this.controls.lock();
        
        // Spawn a new coin to start with
        setTimeout(() => {
            this.spawnCoin();
        }, 1000);
    }
    
    updateDebris(deltaTime) {
        // Update explosion particles from the utility function
        updateDebrisParticles(this.debris, this.scene);
        
        // Handle custom particles with their own update functions
        for (let i = this.debris.length - 1; i >= 0; i--) {
            const particle = this.debris[i];
            
            // If particle has a custom update function, use it
            if (particle.update && typeof particle.update === 'function') {
                const shouldRemove = particle.update(deltaTime);
                if (shouldRemove) {
                    this.scene.remove(particle);
                    this.debris.splice(i, 1);
                }
                continue;
            }
            
            // Skip particles without our custom properties
            if (!particle.creationTime || !particle.lifetime || !particle.velocity) {
                continue;
            }
            
            // Check if particle has expired
            const now = Date.now();
            if (now - particle.creationTime > particle.lifetime) {
                this.scene.remove(particle);
                this.debris.splice(i, 1);
                continue;
            }
            
            // Apply velocity
            particle.position.add(new THREE.Vector3(
                particle.velocity.x * deltaTime,
                particle.velocity.y * deltaTime,
                particle.velocity.z * deltaTime
            ));
            
            // Apply gravity to slow the upward movement
            particle.velocity.y -= 9.8 * deltaTime;
            
            // Fade out based on lifetime
            const age = (now - particle.creationTime) / particle.lifetime;
            particle.material.opacity = 0.7 * (1 - age);
            
            // Shrink based on age
            const scale = 1 - age * 0.7;
            particle.scale.set(scale, scale, scale);
        }
    }
    
    // Add a method to handle explosion particles
    addDebrisParticles(position, color, count, lifetime) {
        const newParticles = createDebrisParticles(this.scene, position, color, count, lifetime);
        this.debris = this.debris.concat(newParticles);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Calculate delta time
        const now = Date.now();
        const deltaTime = (now - this.lastFrameTime) / 1000; // Convert to seconds
        this.lastFrameTime = now;
        
        // Check if any arrow key movement is happening even while paused
        const arrowMovementActive = !this.player.isDestroyed && (
            this.player.movement.forward || 
            this.player.movement.backward || 
            this.player.movement.left || 
            this.player.movement.right
        );
        
        // Skip most updates if game is paused, but still allow arrow key movement
        if (this.isPaused) {
            if (arrowMovementActive) {
                // Only update player movement and camera when using arrow keys while paused
                this.player.update(deltaTime);
                this.updateCamera();
                
                // Check for terrain collisions to stop player from going out of bounds
                if (this.terrain) {
                    const collisionResult = this.terrain.checkCollision(this.player);
                    if (collisionResult.collided) {
                        this.terrain.keepWithinBoundaries(this.player);
                    }
                }
                
                // Render scene with just the updated player position
                this.renderer.render(this.scene, this.camera);
            }
            return;
        }
        
        // Update game objects
        if (!this.player.isDestroyed) {
            this.player.update(deltaTime);
        }
        
        // Update the terrain effects (added for mountain scene)
        if (this.terrain) {
            this.terrain.update(deltaTime);
        }
        
        // Update enemies
        this.updateEnemies(deltaTime);
        
        // Update coins
        this.updateCoins(deltaTime);
        
        // Update power-up status
        this.updatePowerUpStatus();
        
        // Check for collisions
        this.checkCollisions();
        
        // Check coin collisions
        this.checkCoinCollisions();
        
        // Update camera position
        this.updateCamera();
        
        // Update UI
        this.updateUI();
        
        // Update debris particles
        this.updateDebris(deltaTime);
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
        
        // Debug logging (every 100 frames)
        if (!this.frame) this.frame = 0;
        this.frame++;
        
        if (this.frame % 100 === 0) {
            console.log(`Current coins in scene: ${this.coins.length} (visible coins: ${this.coins.filter(c => !c.isCollected).length})`);
            console.log(`Player coins: ${this.playerCoinCount}/${this.requiredCoinsForPowerUp}`);
            console.log(`Total coins collected: ${this.totalCoinsCollected}`);
            console.log(`Current power level: ${this.powerLevel}`);
            
            if (this.powerUpActive) {
                const remainingTime = Math.ceil((this.powerUpDuration - (Date.now() - this.powerUpTimer)) / 1000);
                console.log(`Power-up active: ${remainingTime}s remaining`);
            }
            
            // Force spawn a coin if there are too few visible
            if (this.coins.filter(c => !c.isCollected).length < 2) {
                console.log("Too few visible coins - forcing a spawn");
                this.spawnCoin();
            }
        }
    }
    
    // Show visual warning when hitting boundary
    showBoundaryWarning() {
        // Create a flash effect on the screen
        const flash = document.createElement('div');
        flash.style.position = 'absolute';
        flash.style.top = '0';
        flash.style.left = '0';
        flash.style.width = '100%';
        flash.style.height = '100%';
        flash.style.backgroundColor = 'rgba(255, 102, 0, 0.3)'; // Orange with transparency
        flash.style.pointerEvents = 'none'; // Don't block interaction
        flash.style.zIndex = '100';
        flash.style.opacity = '0.7';
        flash.style.transition = 'opacity 0.5s ease';
        
        document.getElementById('game-container').appendChild(flash);
        
        // Fade out and remove
        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => {
                flash.remove();
            }, 500);
        }, 100);
    }
    
    // Show visual warning when hitting obstacle
    showObstacleWarning() {
        // Create a flash effect on the screen
        const flash = document.createElement('div');
        flash.style.position = 'absolute';
        flash.style.top = '0';
        flash.style.left = '0';
        flash.style.width = '100%';
        flash.style.height = '100%';
        flash.style.backgroundColor = 'rgba(255, 0, 0, 0.2)'; // Red with transparency
        flash.style.pointerEvents = 'none'; // Don't block interaction
        flash.style.zIndex = '100';
        flash.style.opacity = '0.5';
        flash.style.transition = 'opacity 0.5s ease';
        
        document.getElementById('game-container').appendChild(flash);
        
        // Fade out and remove
        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => {
                flash.remove();
            }, 300);
        }, 50);
    }
    
    // Create impact particles for obstacle collisions
    createImpactParticles(position) {
        // Create small dust particles at the impact point
        const particleCount = 5;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            // Create a small sphere for each particle
            const geometry = new THREE.SphereGeometry(0.1, 4, 4);
            const material = new THREE.MeshBasicMaterial({
                color: 0xCCCCCC, // Light gray dust
                transparent: true,
                opacity: 0.7
            });
            
            const particle = new THREE.Mesh(geometry, material);
            
            // Position around the impact point
            particle.position.copy(position);
            particle.position.x += (Math.random() - 0.5) * 1.5;
            particle.position.y += Math.random() * 1.5;
            particle.position.z += (Math.random() - 0.5) * 1.5;
            
            // Add velocity for animation
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                Math.random() * 3 + 1,
                (Math.random() - 0.5) * 3
            );
            
            // Add a lifetime
            particle.lifetime = 800 + Math.random() * 400;
            particle.creationTime = Date.now();
            
            // Add to scene and tracking array
            this.scene.add(particle);
            particles.push(particle);
        }
        
        // Add particles to debris array to be updated
        this.debris = this.debris.concat(particles);
    }
    
    spawnCoin() {
        // Don't spawn more than max coins
        if (this.coins.length >= this.maxCoins) {
            console.log(`Cannot spawn coin: already at max coins (${this.coins.length}/${this.maxCoins})`);
            return null;
        }
        
        console.log(`COIN DEBUG: Attempting to spawn a coin... Current coins: ${this.coins.length}`);
        
        // Find a valid position for the coin (not too close to player or inside obstacles)
        let position;
        let isValidPosition = false;
        let attempts = 0;
        
        while (!isValidPosition && attempts < 20) {
            attempts++;
            
            // Generate a random position within the terrain boundaries
            // Use a smaller area than the entire terrain to ensure coins are more visible
            const boundarySize = this.terrain?.boundarySize ? this.terrain.boundarySize * 0.7 : 100; // 70% of the boundary size for better visibility
            
            // Position coins closer to the player to increase chances of seeing them
            const playerPos = this.player.position;
            
            // Random position but with bias toward the player's area
            const maxDistanceFromPlayer = 30;
            const x = playerPos.x + randomBetween(-maxDistanceFromPlayer, maxDistanceFromPlayer);
            const z = playerPos.z + randomBetween(-maxDistanceFromPlayer, maxDistanceFromPlayer);
            
            // Ensure we're still within terrain boundaries
            const clampedX = clamp(x, -boundarySize / 2, boundarySize / 2);
            const clampedZ = clamp(z, -boundarySize / 2, boundarySize / 2);
            
            position = new THREE.Vector3(clampedX, 0, clampedZ);
            
            // Check if it's too close to the player
            const distToPlayer = distance(position, this.player.position);
            if (distToPlayer < 15) {
                console.log(`COIN DEBUG: Position too close to player (dist: ${distToPlayer}), retrying...`);
                continue; // Too close to player
            }
            
            // Check if it's too close to an existing coin
            let coinCollision = false;
            for (const coin of this.coins) {
                const distToCoin = distance(position, coin.position);
                if (distToCoin < 5) { // Reduced from 8 to 5 to allow coins to spawn closer together
                    coinCollision = true;
                    console.log(`COIN DEBUG: Position too close to another coin (dist: ${distToCoin}), retrying...`);
                    break;
                }
            }
            
            if (coinCollision) {
                continue; // Too close to another coin
            }
            
            // Check if it's inside any obstacle
            let obstacleCollision = false;
            if (this.terrain && this.terrain.obstacles) {
                for (const obstacle of this.terrain.obstacles) {
                    const distToObstacle = distance(position, obstacle.position);
                    if (distToObstacle < obstacle.radius + 2) {
                        obstacleCollision = true;
                        console.log(`COIN DEBUG: Position overlaps with obstacle (dist: ${distToObstacle}), retrying...`);
                        break;
                    }
                }
            }
            
            if (obstacleCollision) {
                continue; // Inside an obstacle
            }
            
            // If we made it here, the position is valid
            isValidPosition = true;
        }
        
        if (!isValidPosition) {
            console.log(`COIN DEBUG: Failed to find valid position for coin after ${attempts} attempts`);
            
            // As a fallback, place the coin in front of the player
            const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.player.tank.quaternion);
            position = new THREE.Vector3()
                .copy(this.player.position)
                .add(forward.multiplyScalar(20)); // 20 units in front of player
            
            console.log(`COIN DEBUG: Using fallback position in front of player: ${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}`);
        }
        
        try {
            // Create and add the coin
            console.log(`COIN DEBUG: Spawning coin at ${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}`);
            const coin = new Coin(this.scene, position);
            this.coins.push(coin);
            
            // Force a larger size for better visibility
            coin.mesh.scale.set(2, 2, 2); // Make coins even larger (was 1.5)
            coin.radius *= 2; // Update collision radius accordingly (was 1.5)
            
            // Make the light stronger
            if (coin.light) {
                coin.light.intensity = 1.5; // Increase light intensity
                coin.light.distance = 8; // Increase light range
            }
            
            // Display a visual indicator at the coin's location
            this.showCoinSpawnIndicator(position);
            
            console.log(`COIN DEBUG: Coin successfully created. Total coins: ${this.coins.length}`);
            return coin;
        } catch (error) {
            console.error(`COIN DEBUG: Error creating coin:`, error);
            return null;
        }
    }
    
    // Add a visual indicator when a coin spawns
    showCoinSpawnIndicator(position) {
        // Create a cylinder that expands outward
        const geometry = new THREE.CylinderGeometry(0.1, 0.1, 6, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0xFFFF00,
            transparent: true,
            opacity: 0.7
        });
        
        const indicator = new THREE.Mesh(geometry, material);
        indicator.position.copy(position);
        indicator.position.y = 3; // Position above the ground
        
        // Add to scene
        this.scene.add(indicator);
        
        // Animate the indicator
        indicator.creationTime = Date.now();
        indicator.lifetime = 2000; // 2 seconds
        
        // Add to debris array for animation and cleanup
        this.debris.push(indicator);
        
        // Add custom update logic
        indicator.update = (dt) => {
            const age = Date.now() - indicator.creationTime;
            const progress = age / indicator.lifetime;
            
            if (progress >= 1) {
                this.scene.remove(indicator);
                return true; // Signal to remove from array
            }
            
            // Expand outward
            const scale = 10 * progress;
            indicator.scale.x = scale;
            indicator.scale.z = scale;
            
            // Fade out
            indicator.material.opacity = 0.7 * (1 - progress);
            
            return false;
        };
    }
    
    updateCoins(deltaTime) {
        // Debug output (every 100 frames)
        if (this.frame % 100 === 0) {
            console.log(`COIN DEBUG: Current coins in scene: ${this.coins.length} (visible coins: ${this.coins.filter(c => !c.isCollected).length})`);
        }
        
        // Update existing coins
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            
            try {
                coin.update(deltaTime);
                
                // Remove fully collected coins
                if (coin.isCollected && Date.now() - coin.collectionTime > coin.collectionAnimationDuration) {
                    console.log(`COIN DEBUG: Removing collected coin after animation`);
                    coin.remove(); // Clean up properly
                    this.coins.splice(i, 1);
                }
            } catch (error) {
                console.error(`COIN DEBUG: Error updating coin:`, error);
                // Remove problematic coin
                if (this.coins[i] && this.coins[i].remove) {
                    this.coins[i].remove();
                }
                this.coins.splice(i, 1);
            }
        }
        
        // Check for coin spawning
        this.coinSpawnTimer += deltaTime * 1000;
        if (this.coinSpawnTimer > this.coinSpawnRate) {
            console.log(`COIN DEBUG: Regular coin spawn timer triggered (${this.coinSpawnTimer.toFixed(0)}ms > ${this.coinSpawnRate}ms)`);
            this.spawnCoin();
            this.coinSpawnTimer = 0;
        }
        
        // Force spawn a coin if there are none in the game and it's been a while since the last spawn
        if (this.coins.length === 0 && this.coinSpawnTimer > this.coinSpawnRate / 2) {
            console.log(`COIN DEBUG: No coins in game - forcing coin spawn`);
            this.spawnCoin();
            this.coinSpawnTimer = 0;
        }
        
        // Every now and then, check if we need more coins
        if (Math.random() < 0.01 && this.coins.filter(c => !c.isCollected).length < 3) {
            console.log(`COIN DEBUG: Not enough coins - spawning additional coin`);
            this.spawnCoin();
        }
    }
    
    checkCoinCollisions() {
        if (this.player.isDestroyed) return;
        
        for (const coin of this.coins) {
            if (coin.isCollected) continue;
            
            const distToPlayer = distance(this.player.position, coin.position);
            
            // Use a larger collection radius for better gameplay
            const collectionRadius = this.player.radius + coin.radius + 2;
            
            if (distToPlayer < collectionRadius) {
                console.log("Collecting coin!");
                coin.collect();
                this.collectCoin();
                
                // Create visual effect at collection point
                this.createCoinCollectionEffect(coin.position);
            }
        }
    }
    
    // Add a visual effect when collecting a coin
    createCoinCollectionEffect(position) {
        // Create particles that burst outward
        const particleCount = 20;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(0.2, 8, 8);
            const material = new THREE.MeshBasicMaterial({
                color: 0xFFD700,
                transparent: true,
                opacity: 0.8
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            
            // Random velocity in all directions
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const speed = 5 + Math.random() * 5;
            
            particle.velocity = new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta) * speed,
                Math.cos(phi) * speed,
                Math.sin(phi) * Math.sin(theta) * speed
            );
            
            particle.lifetime = 1000 + Math.random() * 500;
            particle.creationTime = Date.now();
            
            this.scene.add(particle);
            particles.push(particle);
        }
        
        this.debris = this.debris.concat(particles);
    }
    
    collectCoin() {
        // Increase the coin count
        this.playerCoinCount++;
        this.totalCoinsCollected++;
        
        // Update score
        this.score += 50;
        
        // Update power level based on total coins collected
        this.updatePowerLevel();
        
        // Check if we've reached enough coins for a power-up
        if (this.playerCoinCount >= this.requiredCoinsForPowerUp) {
            this.activatePowerUp();
        }
        
        // Health restoration feature - every 100 coins collected
        if (this.totalCoinsCollected % 100 === 0) {
            // Heal the player by 10 health points
            const healthBonus = 10;
            const originalHealth = this.player.health;
            
            // Don't exceed max health (100)
            this.player.health = Math.min(100, this.player.health + healthBonus);
            
            // Calculate actual health gained (in case player was near max health)
            const actualHealthGained = this.player.health - originalHealth;
            
            console.log(`Health bonus! Restored ${actualHealthGained} health points.`);
            
            // Show visual effect for health gain
            this.showHealthBoostEffect();
            
            // Play health boost sound
            this.playHealthBoostSound();
        }
        
        // Update UI
        this.updateUI();
    }
    
    updatePowerLevel() {
        // Calculate new power level based on total coins collected
        // More coins = higher power level
        const newPowerLevel = 1 + Math.floor(this.totalCoinsCollected / 10);
        
        // Cap power level at a reasonable maximum (e.g., 10)
        this.powerLevel = Math.min(10, newPowerLevel);
        
        // If power-up is active, update the player's damage immediately
        if (this.powerUpActive) {
            this.player.damage = 25 * this.powerLevel;
        }
        
        console.log(`Power level updated to ${this.powerLevel} (based on ${this.totalCoinsCollected} total coins)`);
    }
    
    activatePowerUp() {
        // Reset the coin count
        this.playerCoinCount = 0;
        
        // Clean up any existing power-up effects first
        this.deactivatePowerUp();
        
        // Activate power-up
        this.powerUpActive = true;
        this.powerUpTimer = Date.now();
        
        // Enhance player's projectile damage based on power level
        this.player.damage = 25 * this.powerLevel;
        
        // Calculate power-up color based on power level (from yellow to red as power increases)
        const powerRatio = (this.powerLevel - 1) / 9; // 0 to 1 scale
        const r = 1.0;
        const g = 1.0 - (powerRatio * 0.8); // Decrease green component as power increases
        const b = 0;
        const powerColor = new THREE.Color(r, g, b);
        
        // Visual effect for the tank
        this.showPowerUpEffect(powerColor);
        
        // Play power-up sound
        this.playPowerUpSound();
        
        console.log(`Power-up activated at level ${this.powerLevel}! Damage multiplier: ${this.powerLevel}x`);
    }
    
    updatePowerUpStatus() {
        if (!this.powerUpActive) return;
        
        // Check if power-up duration has expired
        if (Date.now() - this.powerUpTimer > this.powerUpDuration) {
            // Deactivate power-up
            this.deactivatePowerUp();
        }
    }
    
    // New method to cleanly deactivate power-up
    deactivatePowerUp() {
        if (!this.powerUpActive) return;
        
        // Deactivate power-up state
        this.powerUpActive = false;
        
        // Reset player's projectile damage
        this.player.damage = 25; // Back to normal
        
        // Clean up visual effects
        if (this.powerUpSpotlight) {
            this.scene.remove(this.powerUpSpotlight);
            this.powerUpSpotlight = null;
        }
        
        // Clear particle interval
        if (this.powerUpParticleInterval) {
            clearInterval(this.powerUpParticleInterval);
            this.powerUpParticleInterval = null;
        }
        
        console.log("Power-up deactivated");
    }
    
    showPowerUpEffect(powerColor = new THREE.Color(0xFFAA00)) {
        // Create a glow effect around the player's tank with custom color
        const glowColorHex = powerColor.getHex();
        
        // Add a spotlight from above
        const spotlight = new THREE.SpotLight(glowColorHex, 2, 20, Math.PI / 4, 0.2, 0.5);
        spotlight.position.set(this.player.position.x, 20, this.player.position.z);
        spotlight.target = this.player.tank;
        this.scene.add(spotlight);
        
        // Store the spotlight for removal later
        this.powerUpSpotlight = spotlight;
        
        // Add particle effect with custom color
        this.showPowerUpParticles(powerColor);
        
        // Set up a system to periodically emit more particles throughout the longer power-up duration
        this.powerUpParticleInterval = setInterval(() => {
            // Only add more particles if the power-up is still active
            if (this.powerUpActive) {
                this.showPowerUpParticles(powerColor);
            } else {
                // Clear the interval if power-up has ended
                clearInterval(this.powerUpParticleInterval);
            }
        }, 10000); // Add new particles every 10 seconds
        
        // Remove the effects when power-up expires
        setTimeout(() => {
            if (this.powerUpSpotlight) {
                this.scene.remove(this.powerUpSpotlight);
                this.powerUpSpotlight = null;
            }
            
            // Clear the particle interval
            if (this.powerUpParticleInterval) {
                clearInterval(this.powerUpParticleInterval);
                this.powerUpParticleInterval = null;
            }
        }, this.powerUpDuration);
    }
    
    showPowerUpParticles(color = new THREE.Color(0xFFAA00)) {
        // Create a particle system that emanates from the tank
        const particleCount = 30 + (this.powerLevel * 5); // More particles for higher power levels
        const particles = [];
        const colorHex = color.getHex();
        
        for (let i = 0; i < particleCount; i++) {
            // Create a small sphere for each particle
            const geometry = new THREE.SphereGeometry(0.2, 8, 8);
            const material = new THREE.MeshBasicMaterial({
                color: colorHex,
                transparent: true,
                opacity: 0.7
            });
            
            const particle = new THREE.Mesh(geometry, material);
            
            // Position at the tank
            particle.position.copy(this.player.position);
            particle.position.y += 1.5; // Start above the tank
            
            // Add velocity for animation (faster for higher power levels)
            const speedMultiplier = 1 + (this.powerLevel * 0.1);
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5 * speedMultiplier,
                Math.random() * 5 + 5 * speedMultiplier,
                (Math.random() - 0.5) * 5 * speedMultiplier
            );
            
            // Add a lifetime
            particle.lifetime = 1000 + Math.random() * 500;
            particle.creationTime = Date.now();
            
            // Add to scene and tracking array
            this.scene.add(particle);
            particles.push(particle);
        }
        
        // Add particles to debris array to be updated
        this.debris = this.debris.concat(particles);
    }
    
    playPowerUpSound() {
        // Check if we can create a simple sound effect
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioCtx();
            
            // Create a power-up activation sound
            const oscillator1 = audioCtx.createOscillator();
            const oscillator2 = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            // Increase pitch based on power level
            const powerFactor = this.powerLevel / 5;
            
            oscillator1.type = 'sine';
            oscillator1.frequency.setValueAtTime(220 * powerFactor, audioCtx.currentTime); // A3
            oscillator1.frequency.exponentialRampToValueAtTime(880 * powerFactor, audioCtx.currentTime + 0.5); // A5
            
            oscillator2.type = 'sine';
            oscillator2.frequency.setValueAtTime(277.18 * powerFactor, audioCtx.currentTime); // C#4
            oscillator2.frequency.exponentialRampToValueAtTime(1108.73 * powerFactor, audioCtx.currentTime + 0.5); // C#6
            
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.7);
            
            oscillator1.connect(gainNode);
            oscillator2.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator1.start();
            oscillator2.start();
            oscillator1.stop(audioCtx.currentTime + 0.7);
            oscillator2.stop(audioCtx.currentTime + 0.7);
        }
    }
    
    createUI() {
        // Create UI container if it doesn't exist
        if (!document.getElementById('game-ui')) {
            const uiContainer = document.createElement('div');
            uiContainer.id = 'game-ui';
            uiContainer.className = 'game-ui';
            document.getElementById('game-container').appendChild(uiContainer);
        }
        
        // Get the existing score and health elements
        const scoreValue = document.getElementById('score-value');
        const healthValue = document.getElementById('health-value');
        
        // Update if they exist
        if (scoreValue) scoreValue.textContent = this.score;
        if (healthValue) healthValue.textContent = this.health;
        
        // Create coin counter
        const coinDisplay = document.createElement('div');
        coinDisplay.id = 'coin-display';
        coinDisplay.className = 'ui-element coin-counter';
        coinDisplay.innerHTML = `Coins: ${this.playerCoinCount}/${this.requiredCoinsForPowerUp}`;
        document.getElementById('game-ui').appendChild(coinDisplay);
        
        // Create power level display
        const powerLevelDisplay = document.createElement('div');
        powerLevelDisplay.id = 'power-level';
        powerLevelDisplay.className = 'ui-element power-level';
        powerLevelDisplay.textContent = `Power: ${this.powerLevel}x`;
        document.getElementById('game-ui').appendChild(powerLevelDisplay);
        
        // Create power-up indicator (hidden initially)
        const powerUpIndicator = document.createElement('div');
        powerUpIndicator.id = 'power-up-indicator';
        powerUpIndicator.className = 'ui-element power-up-indicator';
        powerUpIndicator.textContent = 'POWER UP ACTIVE!';
        powerUpIndicator.style.display = 'none';
        document.getElementById('game-ui').appendChild(powerUpIndicator);
        
        // Create a start message
        const startMessage = document.createElement('div');
        startMessage.id = 'start-message';
        startMessage.className = 'start-message';
        startMessage.innerHTML = `
            <h2>TANK GAME</h2>
            <div class="controls-info">
                <p class="highlight">You can use ↑ ↓ ← → ARROW KEYS to move immediately!</p>
                <p>CLICK ANYWHERE to enable advanced controls:</p>
                <ul>
                    <li>WASD: Alternative movement</li>
                    <li>Mouse: Aim turret</li>
                    <li>Left Mouse Button or Spacebar: Fire</li>
                    <li>Q/E: Rotate turret</li>
                    <li>ESC: Pause game</li>
                </ul>
            </div>`;
        document.getElementById('game-container').appendChild(startMessage);
    }
    
    // Show visual effect for health boost
    showHealthBoostEffect() {
        // Create a green flash effect on the screen
        const flash = document.createElement('div');
        flash.style.position = 'absolute';
        flash.style.top = '0';
        flash.style.left = '0';
        flash.style.width = '100%';
        flash.style.height = '100%';
        flash.style.backgroundColor = 'rgba(0, 255, 0, 0.2)'; // Green with transparency
        flash.style.pointerEvents = 'none'; // Don't block interaction
        flash.style.zIndex = '100';
        flash.style.opacity = '0.6';
        flash.style.transition = 'opacity 1.5s ease';
        
        document.getElementById('game-container').appendChild(flash);
        
        // Fade out and remove
        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => {
                flash.remove();
            }, 1500);
        }, 300);
        
        // Create particle effect around the tank
        this.createHealthBoostParticles();
        
        // Display floating text
        this.showFloatingText("+10 HEALTH", this.player.position, 0x00FF00);
    }
    
    // Create healing particles that circle around the player's tank
    createHealthBoostParticles() {
        const particleCount = 30;
        const particles = [];
        const color = 0x00FF00; // Bright green
        
        for (let i = 0; i < particleCount; i++) {
            // Create a small cross for each particle (more medical-looking)
            const group = new THREE.Group();
            
            // Horizontal part of cross
            const horizontalGeometry = new THREE.BoxGeometry(0.4, 0.1, 0.1);
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.8
            });
            const horizontal = new THREE.Mesh(horizontalGeometry, material);
            group.add(horizontal);
            
            // Vertical part of cross
            const verticalGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.1);
            const vertical = new THREE.Mesh(verticalGeometry, material);
            group.add(vertical);
            
            // Position at the tank but slightly elevated
            group.position.copy(this.player.position);
            group.position.y += 1.0 + Math.random() * 2.0;
            
            // Add custom properties for animation
            group.userData = {
                // Initial angle around the tank
                angle: Math.random() * Math.PI * 2,
                // Distance from tank center
                radius: 3 + Math.random() * 2,
                // Vertical oscillation
                ySpeed: 0.5 + Math.random() * 1.5,
                // Rotation speed around tank
                rotationSpeed: (0.5 + Math.random() * 1.5) * (Math.random() > 0.5 ? 1 : -1),
                // How long this particle lives
                lifetime: 2000 + Math.random() * 1000,
                creationTime: Date.now()
            };
            
            // Add to scene and tracking array
            this.scene.add(group);
            particles.push(group);
        }
        
        // Add custom update logic for these particles
        for (const particle of particles) {
            particle.update = (deltaTime) => {
                const userData = particle.userData;
                const age = Date.now() - userData.creationTime;
                
                if (age > userData.lifetime) {
                    this.scene.remove(particle);
                    return true; // Should be removed
                }
                
                // Update angle around tank
                userData.angle += userData.rotationSpeed * deltaTime;
                
                // Update position in circular pattern around tank
                particle.position.x = this.player.position.x + Math.cos(userData.angle) * userData.radius;
                particle.position.z = this.player.position.z + Math.sin(userData.angle) * userData.radius;
                
                // Oscillate vertically
                particle.position.y += Math.sin(age / 200) * userData.ySpeed * deltaTime;
                
                // Rotate the cross
                particle.rotation.y += 2 * deltaTime;
                particle.rotation.x += 2 * deltaTime;
                
                // Fade out based on lifetime
                const progress = age / userData.lifetime;
                particle.children.forEach(child => {
                    child.material.opacity = 0.8 * (1 - progress);
                });
                
                // Scale based on lifetime - grow then shrink
                const scale = progress < 0.5 
                    ? 1 + progress 
                    : 2 - progress;
                particle.scale.set(scale, scale, scale);
                
                return false; // Keep updating
            };
        }
        
        // Add to debris array to be updated
        this.debris = this.debris.concat(particles);
    }
    
    // Show floating text at a position in 3D space
    showFloatingText(text, position, color = 0xFFFFFF) {
        // Create HTML element for the text
        const textElement = document.createElement('div');
        textElement.textContent = text;
        textElement.style.position = 'absolute';
        textElement.style.color = '#' + color.toString(16).padStart(6, '0');
        textElement.style.fontSize = '24px';
        textElement.style.fontWeight = 'bold';
        textElement.style.textShadow = '0 0 5px black';
        textElement.style.pointerEvents = 'none';
        textElement.style.opacity = '1';
        textElement.style.transition = 'opacity 1s ease, transform 1s ease';
        
        // Add to DOM
        document.getElementById('game-container').appendChild(textElement);
        
        // Function to update text position based on 3D coordinates
        const updatePosition = () => {
            // Convert 3D position to screen coordinates
            const vector = new THREE.Vector3();
            vector.copy(position);
            vector.y += 2; // Position text above the target
            
            // Project to screen space
            vector.project(this.camera);
            
            // Convert to CSS coordinates
            const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;
            
            // Set element position
            textElement.style.left = x + 'px';
            textElement.style.top = y + 'px';
            textElement.style.transform = 'translate(-50%, -50%)';
        };
        
        // Set initial position
        updatePosition();
        
        // Animate the text upward and fade out
        setTimeout(() => {
            textElement.style.opacity = '0';
            textElement.style.transform = 'translate(-50%, -150%)';
            
            // Remove from DOM after animation
            setTimeout(() => {
                textElement.remove();
            }, 1000);
        }, 500);
        
        // Return the update function in case we want to keep updating position
        return updatePosition;
    }
    
    // Play sound effect for health boost
    playHealthBoostSound() {
        // Check if we can create audio
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioCtx();
            
            // Create a pleasant healing sound
            const oscillator1 = audioCtx.createOscillator();
            const oscillator2 = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            // Configure oscillators for a pleasant chord
            oscillator1.type = 'sine';
            oscillator1.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
            oscillator1.frequency.linearRampToValueAtTime(880, audioCtx.currentTime + 0.7); // A5
            
            oscillator2.type = 'sine';
            oscillator2.frequency.setValueAtTime(554.37, audioCtx.currentTime); // C#5
            oscillator2.frequency.linearRampToValueAtTime(1108.73, audioCtx.currentTime + 0.7); // C#6
            
            // Configure gain for an envelope effect
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.1);
            gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.5);
            gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.7);
            
            // Connect nodes
            oscillator1.connect(gainNode);
            oscillator2.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            // Play the sound
            oscillator1.start();
            oscillator2.start();
            oscillator1.stop(audioCtx.currentTime + 0.7);
            oscillator2.stop(audioCtx.currentTime + 0.7);
        }
    }
    
    // Create health bonus display with progress bar
    createHealthBonusDisplay() {
        // Create container
        const container = document.createElement('div');
        container.id = 'health-bonus-container';
        container.className = 'ui-element health-bonus-container';
        
        // Create text display
        const textDisplay = document.createElement('div');
        textDisplay.id = 'health-bonus';
        textDisplay.textContent = `Health Bonus: ${this.totalCoinsCollected % 100}/100`;
        container.appendChild(textDisplay);
        
        // Create progress bar container
        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-container';
        progressContainer.style.width = '100%';
        progressContainer.style.height = '8px';
        progressContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        progressContainer.style.borderRadius = '4px';
        progressContainer.style.marginTop = '5px';
        progressContainer.style.overflow = 'hidden';
        container.appendChild(progressContainer);
        
        // Create progress bar
        const progressBar = document.createElement('div');
        progressBar.id = 'health-bonus-progress';
        progressBar.style.width = `${this.totalCoinsCollected % 100}%`;
        progressBar.style.height = '100%';
        progressBar.style.backgroundColor = '#FF5500';
        progressBar.style.transition = 'width 0.3s ease-out, background-color 0.5s';
        progressContainer.appendChild(progressBar);
        
        // Add to UI container
        const uiContainer = document.getElementById('game-ui');
        if (uiContainer) {
            uiContainer.appendChild(container);
        } else {
            document.getElementById('game-container').appendChild(container);
        }
    }
    
    // New method to force spawn coins directly around the player in a circle
    forceSpawnCoinsAroundPlayer() {
        console.log("COIN DEBUG: Force spawning coins around player");
        
        // Spawn 5 coins in a circle around the player
        const numCoins = 5;
        const radius = 20; // Distance from player
        
        for (let i = 0; i < numCoins; i++) {
            const angle = (i / numCoins) * Math.PI * 2;
            const x = this.player.position.x + Math.cos(angle) * radius;
            const z = this.player.position.z + Math.sin(angle) * radius;
            
            const position = new THREE.Vector3(x, 0, z);
            
            console.log(`COIN DEBUG: Placing coin ${i+1} at ${x.toFixed(2)}, 0, ${z.toFixed(2)}`);
            
            try {
                const coin = new Coin(this.scene, position);
                this.coins.push(coin);
                
                // Make it extra visible
                coin.mesh.scale.set(2.5, 2.5, 2.5);
                coin.radius *= 2.5;
                
                if (coin.light) {
                    coin.light.intensity = 2.0;
                    coin.light.distance = 10;
                }
                
                if (coin.pulseLight) {
                    coin.pulseLight.intensity = 1.5;
                    coin.pulseLight.distance = 8;
                }
                
                // Show a bigger spawn indicator
                this.showCoinSpawnIndicator(position);
            } catch (error) {
                console.error(`COIN DEBUG: Error creating forced coin:`, error);
            }
        }
    }
} 