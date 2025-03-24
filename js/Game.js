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
        
        // Create crosshair
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
        this.renderer.domElement.addEventListener('click', () => {
            if (!this.controls.isLocked) {
                this.controls.lock();
            }
        });
        
        // Event listeners for pointer lock changes
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === document.body) {
                this.isPaused = false;
            } else {
                this.isPaused = true;
            }
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
        if (this.isGameOver || this.isPaused) return;
        
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.player.movement.forward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.player.movement.backward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.player.movement.left = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
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
        
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.player.movement.forward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.player.movement.backward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.player.movement.left = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
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
    }
    
    updateUI() {
        // Update health display
        document.getElementById('health-value').textContent = Math.max(0, this.player.health);
        
        // Update score display
        document.getElementById('score-value').textContent = this.score;
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
        // Reset game state
        this.score = 0;
        this.isGameOver = false;
        this.difficulty = 1;
        
        // Reset player
        this.player.reset();
        
        // Remove all enemies
        for (const enemy of this.enemies) {
            this.scene.remove(enemy.tank);
        }
        this.enemies = [];
        
        // Reset UI
        document.getElementById('score-value').textContent = '0';
        document.getElementById('health-value').textContent = '100';
        document.getElementById('game-over').classList.add('hidden');
        
        // Lock pointer again
        this.controls.lock();
    }
    
    updateDebris(deltaTime) {
        // Update explosion particles from the utility function
        updateDebrisParticles(this.debris, this.scene);
        
        // Also handle our custom impact particles for obstacle collisions
        const now = Date.now();
        
        for (let i = this.debris.length - 1; i >= 0; i--) {
            const particle = this.debris[i];
            
            // Skip particles without our custom properties
            if (!particle.creationTime || !particle.lifetime || !particle.velocity) {
                continue;
            }
            
            // Check if particle has expired
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
        
        // Skip updates if game is paused or over
        if (this.isPaused) return;
        
        // Update game objects
        if (!this.player.isDestroyed) {
            this.player.update(deltaTime);
        }
        
        // Update enemies
        this.updateEnemies(deltaTime);
        
        // Check for collisions
        this.checkCollisions();
        
        // Update camera position
        this.updateCamera();
        
        // Update UI
        this.updateUI();
        
        // Update debris particles
        this.updateDebris(deltaTime);
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
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
} 