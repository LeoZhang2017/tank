/**
 * Tank class representing the player's tank
 */
class Tank {
    constructor(scene, isPlayer = true, game = null) {
        this.scene = scene;
        this.isPlayer = isPlayer;
        this.health = 100;
        this.speed = 10;
        this.turnSpeed = 1.5;
        this.fireRate = 500; // milliseconds between shots
        this.lastFired = 0;
        this.radius = 2; // For collision detection
        this.projectiles = [];
        this.isDestroyed = false;
        this.game = game; // Store reference to the game instance
        this.damage = 25; // Base damage for projectiles
        
        // Tank body group
        this.tank = new THREE.Group();
        
        // Set initial position
        if (isPlayer) {
            this.tank.position.set(0, 0.5, 0);
        } else {
            // Random position for enemy tanks
            const x = randomBetween(-40, 40);
            const z = randomBetween(-40, 40);
            // Ensure enemy tanks don't spawn too close to the player
            if (Math.abs(x) < 15 && Math.abs(z) < 15) {
                this.tank.position.set(x > 0 ? x + 15 : x - 15, 0.5, z > 0 ? z + 15 : z - 15);
            } else {
                this.tank.position.set(x, 0.5, z);
            }
        }
        
        // Add tank to scene
        scene.add(this.tank);
        
        // Create position vector for convenience
        this.position = this.tank.position;
        
        // Movement flags for player control
        this.movement = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            turretLeft: false,
            turretRight: false
        };
        
        // Load the appropriate tank model
        this.loadTankModel(isPlayer);
    }
    
    loadTankModel(isPlayer) {
        // First create a simple geometric tank as a fallback while model loads
        this.createSimpleTank(isPlayer);
        
        // Check if we should attempt to load external models
        const useExternalModels = false; // Set to false to use simple models only
        
        if (useExternalModels) {
            // Use GLTFLoader to load a 3D model
            const loader = new THREE.GLTFLoader();
            const modelUrl = isPlayer ? 'models/abrams_tank.glb' : 'models/enemy_tank.glb';
            
            loader.load(
                modelUrl,
                (gltf) => {
                    // Success callback
                    const model = gltf.scene;
                    
                    // Scale the model appropriately
                    model.scale.set(0.5, 0.5, 0.5);
                    
                    // Remove the simple placeholder tank
                    while (this.tank.children.length > 0) {
                        this.tank.remove(this.tank.children[0]);
                    }
                    
                    // Add the loaded model to the tank group
                    this.tank.add(model);
                    
                    // Store references to key parts (turret, cannon) if they exist in the model
                    model.traverse((child) => {
                        if (child.name === 'turret') {
                            this.turret = child;
                        }
                        if (child.name === 'cannon') {
                            this.cannon = child;
                        }
                    });
                    
                    // If turret or cannon weren't found, create them
                    if (!this.turret || !this.cannon) {
                        this.createTurretAndCannon(isPlayer);
                    }
                },
                (xhr) => {
                    // Progress callback
                    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                },
                (error) => {
                    // Error callback
                    console.error('An error occurred loading the tank model:', error);
                    // Keep using the simple tank
                }
            );
        } else {
            // Just use the simple tank model that was already created
            console.log(`Using simple geometric ${isPlayer ? 'player' : 'enemy'} tank model`);
        }
    }
    
    createSimpleTank(isPlayer) {
        // Tank body
        const bodyGeometry = new THREE.BoxGeometry(3, 1, 4);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: isPlayer ? 0x2E6B89 : 0x8B3A3A 
        });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.position.y = 1;
        this.tank.add(this.body);
        
        // Create the turret and cannon
        this.createTurretAndCannon(isPlayer);
        
        // Tank tracks
        const trackGeometry = new THREE.BoxGeometry(0.8, 0.8, 4.2);
        const trackMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 });
        
        this.leftTrack = new THREE.Mesh(trackGeometry, trackMaterial);
        this.leftTrack.position.set(-1.4, 0.4, 0);
        this.tank.add(this.leftTrack);
        
        this.rightTrack = new THREE.Mesh(trackGeometry, trackMaterial);
        this.rightTrack.position.set(1.4, 0.4, 0);
        this.tank.add(this.rightTrack);
    }
    
    createTurretAndCannon(isPlayer) {
        // Tank turret
        const turretGeometry = new THREE.CylinderGeometry(1, 1, 0.8, 16);
        const turretMaterial = new THREE.MeshPhongMaterial({ 
            color: isPlayer ? 0x205970 : 0x7B2929 
        });
        this.turret = new THREE.Mesh(turretGeometry, turretMaterial);
        this.turret.position.y = 1.9;
        this.turret.rotation.x = Math.PI / 2;
        this.tank.add(this.turret);
        
        // Tank cannon
        const cannonGeometry = new THREE.CylinderGeometry(0.2, 0.2, 3, 8);
        const cannonMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x111111 
        });
        this.cannon = new THREE.Mesh(cannonGeometry, cannonMaterial);
        this.cannon.position.set(0, 1.9, 1.8);
        this.cannon.rotation.x = Math.PI / 2;
        this.tank.add(this.cannon);
    }
    
    update(deltaTime) {
        if (this.isDestroyed) {
            console.log("Tank is destroyed, skipping update");
            return;
        }
        
        // Handle player movement
        if (this.isPlayer) {
            // Calculate movement speeds
            const moveSpeed = this.speed * deltaTime;
            const turnSpeed = this.turnSpeed * deltaTime;
            
            // Store current position for debugging
            const startPos = this.tank.position.clone();
            
            // Forward/backward movement
            if (this.movement.forward) {
                // Create direction vector in tank's forward direction
                const direction = new THREE.Vector3(0, 0, 1);
                direction.applyQuaternion(this.tank.quaternion);
                
                // Scale by speed
                direction.multiplyScalar(moveSpeed);
                
                // Apply to position directly
                this.tank.position.add(direction);
                console.log("Moving forward:", direction, "New pos:", this.tank.position.clone());
            }
            
            if (this.movement.backward) {
                const direction = new THREE.Vector3(0, 0, -1);
                direction.applyQuaternion(this.tank.quaternion);
                direction.multiplyScalar(moveSpeed * 0.6); // Slower in reverse
                this.tank.position.add(direction);
                console.log("Moving backward:", direction, "New pos:", this.tank.position.clone());
            }
            
            // Left/right rotation (tank body)
            if (this.movement.left) {
                this.tank.rotation.y += turnSpeed;
                console.log("Rotating left:", turnSpeed, "New rotation:", this.tank.rotation.y);
            }
            
            if (this.movement.right) {
                this.tank.rotation.y -= turnSpeed;
                console.log("Rotating right:", turnSpeed, "New rotation:", this.tank.rotation.y);
            }
            
            // Check if position actually changed
            if (!startPos.equals(this.tank.position)) {
                console.log("Position changed from", startPos, "to", this.tank.position.clone());
            }
            
            // Turret rotation independent of tank body
            if (this.movement.turretLeft) {
                this.turret.rotateY(this.turnSpeed * 1.5 * deltaTime);
                this.cannon.rotateY(this.turnSpeed * 1.5 * deltaTime);
            }
            if (this.movement.turretRight) {
                this.turret.rotateY(-this.turnSpeed * 1.5 * deltaTime);
                this.cannon.rotateY(-this.turnSpeed * 1.5 * deltaTime);
            }
            
            // Log movement approximately every 30 frames
            if (Math.random() < 0.03) {
                console.log("Tank movement state:", {
                    position: this.tank.position.clone(),
                    forward: this.movement.forward,
                    backward: this.movement.backward,
                    left: this.movement.left,
                    right: this.movement.right,
                    moved: this.movement.forward || this.movement.backward || this.movement.left || this.movement.right
                });
            }
        } else {
            // Enemy AI logic will be implemented here
            // Simple tracking behavior for now
            // This will be expanded in the Game.js file
        }
        
        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            // Update projectile position
            projectile.update(deltaTime);
            
            // Remove projectiles that have exceeded their lifetime or should be removed
            if (projectile.shouldRemove) {
                // Call remove function to clean up all meshes and particles
                projectile.remove();
                this.projectiles.splice(i, 1);
            }
        }
        
        // Ensure tank stays on the ground
        this.tank.position.y = 0.5;
    }
    
    fire() {
        const now = Date.now();
        if (now - this.lastFired < this.fireRate) return;
        
        this.lastFired = now;
        console.log("Tank attempting to fire!");
        
        // Play firing sound effect
        this.playFireSound();
        
        // Calculate spawn position at the end of the cannon
        let cannonTip;
        let direction;
        let worldPos;
        
        // For 3D model with proper hierarchy
        if (this.cannon && this.cannon.position) {
            // Get cannon length (assuming Z is forward in model space)
            let cannonLength = 2; // Default value
            
            // If cannon is a complex mesh, try to determine its length
            if (this.cannon.geometry && this.cannon.geometry.boundingBox) {
                this.cannon.geometry.computeBoundingBox();
                const box = this.cannon.geometry.boundingBox;
                cannonLength = box.max.z - box.min.z;
            }
            
            // Create position at the end of the cannon
            cannonTip = new THREE.Vector3(0, 0, cannonLength);
            cannonTip.applyQuaternion(this.cannon.quaternion);
            cannonTip.add(this.cannon.position);
            
            // Convert to world position
            worldPos = new THREE.Vector3();
            this.tank.localToWorld(worldPos.copy(cannonTip));
            
            // Set Y position slightly higher to avoid immediate collision with tank
            worldPos.y += 0.5;
            
            // Get direction from cannon forward direction
            direction = new THREE.Vector3(0, 0, 1);
            direction.applyQuaternion(this.cannon.getWorldQuaternion(new THREE.Quaternion()));
            
            // Add a slight upward angle to prevent hitting the ground immediately
            direction.y += 0.05;
            // Ensure the direction vector is normalized
            direction.normalize();
            
            console.log("Firing projectile in direction:", direction.clone());
            
            // Create muzzle flash
            this.createMuzzleFlash(worldPos, direction);
            
            // Create projectile with game reference
            const projectile = new Projectile(
                this.scene,
                worldPos,
                direction,
                this.isPlayer,
                this.game,
                this.damage
            );
            
            this.projectiles.push(projectile);
            
            // Return the projectile in case we need to track it
            return projectile;
        }
        else {
            // Fallback for simple tank model
            cannonTip = new THREE.Vector3(0, 0, 2);
            cannonTip.applyQuaternion(this.cannon.quaternion);
            cannonTip.add(this.cannon.position);
            
            // Convert to world position
            worldPos = new THREE.Vector3();
            this.tank.localToWorld(worldPos.copy(cannonTip));
            
            // Set Y position slightly higher to avoid immediate collision with tank
            worldPos.y += 0.5;
            
            // Get direction from cannon or tank forward direction
            direction = new THREE.Vector3(0, 0, 1);
            direction.applyQuaternion(this.cannon.getWorldQuaternion(new THREE.Quaternion()));
            
            // Add a slight upward angle to prevent hitting the ground immediately
            direction.y += 0.05;
            // Ensure the direction vector is normalized
            direction.normalize();
            
            console.log("Firing projectile in direction:", direction.clone());
            
            // Create muzzle flash
            this.createMuzzleFlash(worldPos, direction);
            
            // Create projectile with a separate direction vector (don't share references)
            // and pass the game reference
            const projectile = new Projectile(
                this.scene,
                worldPos.clone(),
                direction.clone(),
                this.isPlayer,
                this.game,
                this.damage
            );
            
            this.projectiles.push(projectile);
            
            // Return the projectile in case we need to track it
            return projectile;
        }
    }
    
    // Create a muzzle flash effect
    createMuzzleFlash(position, direction) {
        // Create a point light for the muzzle flash
        const flashColor = this.isPlayer ? 0x00FFFF : 0xFF4400;
        const flash = new THREE.PointLight(flashColor, 3, 10);
        flash.position.copy(position);
        this.scene.add(flash);
        
        // Remove the flash after a short time
        setTimeout(() => {
            this.scene.remove(flash);
        }, 100);
        
        // Create a small cone pointing in the firing direction
        const flashGeometry = new THREE.ConeGeometry(0.3, 1, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: flashColor,
            transparent: true,
            opacity: 0.8
        });
        
        const flashMesh = new THREE.Mesh(flashGeometry, flashMaterial);
        
        // Position and orient the flash
        flashMesh.position.copy(position);
        const flashDirection = direction.clone();
        
        // Make the flash point in the firing direction
        const lookAtPos = new THREE.Vector3().copy(position).add(flashDirection);
        flashMesh.lookAt(lookAtPos);
        // Rotate 90 degrees so the cone's tip points forward
        flashMesh.rotateX(Math.PI / 2);
        
        this.scene.add(flashMesh);
        
        // Remove the flash mesh after a short time
        setTimeout(() => {
            this.scene.remove(flashMesh);
        }, 100);
    }
    
    takeDamage(amount) {
        this.health -= amount;
        
        if (this.health <= 0 && !this.isDestroyed) {
            this.destroy();
        }
        
        return this.health;
    }
    
    destroy() {
        this.isDestroyed = true;
        
        // Create explosion particles
        createDebrisParticles(this.scene, this.position, 0xFF5500, 30, 3000);
        
        // Hide the tank (in a more advanced game, we'd show a destroyed model)
        this.tank.visible = false;
        
        // In a more advanced game, we might play an explosion sound here
    }
    
    reset() {
        if (this.isPlayer) {
            this.tank.position.set(0, 0.5, 0);
            this.tank.rotation.set(0, 0, 0);
            this.turret.rotation.set(Math.PI / 2, 0, 0);
            this.cannon.rotation.set(Math.PI / 2, 0, 0);
        }
        
        this.health = 100;
        this.isDestroyed = false;
        this.tank.visible = true;
        
        // Clear projectiles
        for (const projectile of this.projectiles) {
            this.scene.remove(projectile.mesh);
        }
        this.projectiles = [];
    }
    
    // Add method to play fire sound
    playFireSound() {
        // Check if we can create a simple sound effect
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioCtx();
            
            // Create a simple cannon fire sound
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(150, audioCtx.currentTime); 
            oscillator.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.3);
        }
    }
    
    // Play sound when colliding with obstacle
    playCollisionSound() {
        // Check if we can create a simple sound effect
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioCtx();
            
            // Create a collision sound
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(100, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.6, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.2);
        }
    }
} 