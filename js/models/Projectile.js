/**
 * Projectile class for tank shells
 */
class Projectile {
    constructor(scene, position, direction, isFromPlayer = true, game = null, damage = 25) {
        this.scene = scene;
        this.isFromPlayer = isFromPlayer;
        this.speed = 50;
        this.damage = damage; // Use the provided damage value (affected by power-ups)
        this.lifetime = 3000; // milliseconds
        this.creationTime = Date.now();
        this.shouldRemove = false;
        this.radius = 0.5; // Increased for collision detection
        this.game = game; // Reference to the game instance for debris particles
        
        // Determine if this is a powered-up projectile
        this.isPoweredUp = isFromPlayer && this.damage > 25;
        
        // Calculate power factor (1.0 for normal, higher for powered up)
        this.powerFactor = this.damage / 25;
        
        // Base colors (cyan for player, red-orange for enemy)
        let projectileColor, projectileEmissive;
        
        if (isFromPlayer) {
            if (this.isPoweredUp) {
                // Power-up colors based on damage level
                const powerRatio = Math.min((this.powerFactor - 1) / 9, 1); // 0 to 1 scale
                
                // Transition from yellow to orange to red as power increases
                projectileColor = new THREE.Color(1.0, 1.0 - powerRatio * 0.7, 0);
                projectileEmissive = new THREE.Color(0.8, 0.8 - powerRatio * 0.7, 0);
            } else {
                // Normal player projectile (cyan)
                projectileColor = new THREE.Color(0x00FFFF);
                projectileEmissive = new THREE.Color(0x00AAAA);
            }
        } else {
            // Enemy projectile (red-orange)
            projectileColor = new THREE.Color(0xFF4400);
            projectileEmissive = new THREE.Color(0xAA2200);
        }
        
        // Create projectile mesh
        const projectileSize = this.isPoweredUp ? 0.8 * this.powerFactor : 0.8;
        const geometry = new THREE.SphereGeometry(projectileSize, 12, 12);
        const material = new THREE.MeshPhongMaterial({
            color: projectileColor,
            emissive: projectileEmissive,
            shininess: 50,
            emissiveIntensity: this.isPoweredUp ? 1.5 * this.powerFactor : 1.5
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        
        // Normalize direction and store
        this.direction = direction.clone().normalize();
        
        // Add to scene
        scene.add(this.mesh);
        
        // Create position vector for convenience - make it a direct reference to mesh position
        this.position = this.mesh.position;
        
        // Add motion blur effect (stretched cylinder along movement direction)
        const blurLength = this.isPoweredUp ? 2.0 * this.powerFactor : 2.0;
        const blurGeometry = new THREE.CylinderGeometry(
            projectileSize * 0.6, // Radius top
            projectileSize * 0.6, // Radius bottom
            blurLength,           // Height
            8                     // Radial segments
        );
        const blurMaterial = new THREE.MeshBasicMaterial({
            color: projectileColor,
            transparent: true,
            opacity: this.isPoweredUp ? 0.4 * this.powerFactor : 0.4
        });
        this.motionBlur = new THREE.Mesh(blurGeometry, blurMaterial);
        this.motionBlur.rotation.x = Math.PI / 2; // Orient along z-axis
        this.scene.add(this.motionBlur);
        
        // Position the motion blur behind the projectile
        this.updateMotionBlur();
        
        // Add a point light to make it glow
        const lightIntensity = this.isPoweredUp ? 2.5 * this.powerFactor : 2.5;
        const lightRange = this.isPoweredUp ? 12 * this.powerFactor : 12;
        
        this.light = new THREE.PointLight(
            projectileColor,
            lightIntensity,
            lightRange
        );
        this.light.position.copy(position);
        scene.add(this.light);
        
        // Add trail particles
        this.particles = [];
        this.lastParticleTime = 0;
        this.particleFrequency = this.isPoweredUp ? 
            Math.max(5, 20 - (this.powerFactor * 2)) : // More frequent particles for powered-up projectiles
            20; // ms between particles (default)
        
        // Debug
        if (this.isPoweredUp) {
            console.log(`Powered-up projectile created with damage: ${this.damage}, power factor: ${this.powerFactor.toFixed(2)}`);
        } else {
            console.log("Projectile created at", position.clone(), "with direction", direction.clone());
        }
    }
    
    update(deltaTime) {
        // Check if projectile should be removed
        if (Date.now() - this.creationTime > this.lifetime) {
            this.shouldRemove = true;
            return;
        }
        
        // Get current position for debug
        const oldPos = this.position.clone();
        
        // Move the projectile - use a constant value if deltaTime is too small or undefined
        const effectiveDelta = deltaTime ? Math.max(deltaTime, 0.016) : 0.016; // Ensure at least 16ms (60fps equivalent)
        
        // Calculate movement vector
        const movementDistance = this.speed * effectiveDelta;
        const movement = this.direction.clone().multiplyScalar(movementDistance);
        
        // Apply movement to position
        this.position.add(movement);
        this.light.position.copy(this.position);
        
        // Update motion blur position and orientation
        this.updateMotionBlur();
        
        // Debug logging every 10 frames approximately
        if (Math.random() < 0.1) {
            console.log("Projectile moved from", oldPos, "to", this.position.clone(), 
                        "- Delta:", effectiveDelta, "- Movement:", movementDistance);
        }
        
        // Create trail particles (simplified)
        if (Date.now() - this.lastParticleTime > this.particleFrequency) {
            this.createTrailParticle();
            this.lastParticleTime = Date.now();
        }
        
        // Update trail particles
        this.updateTrailParticles();
        
        // Check for ground collision (simple implementation)
        if (this.position.y < 0) {
            this.explode();
            this.shouldRemove = true;
        }
    }
    
    createTrailParticle() {
        // Determine particle color based on projectile type
        let particleColor;
        
        if (this.isFromPlayer) {
            if (this.isPoweredUp) {
                // Power-up colors based on damage level
                const powerRatio = Math.min((this.powerFactor - 1) / 9, 1); // 0 to 1 scale
                particleColor = new THREE.Color(1.0, 1.0 - powerRatio * 0.7, 0);
            } else {
                // Normal player projectile (cyan)
                particleColor = new THREE.Color(0x00FFFF);
            }
        } else {
            // Enemy projectile (red-orange)
            particleColor = new THREE.Color(0xFF4400);
        }
        
        // Scale particle size with power
        const particleSize = this.isPoweredUp ? 0.4 * this.powerFactor : 0.4;
        
        const geometry = new THREE.SphereGeometry(particleSize, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: particleColor,
            transparent: true,
            opacity: 0.7
        });
        
        const particle = new THREE.Mesh(geometry, material);
        particle.position.copy(this.position);
        
        // Add small random offset to create a wider trail
        const offsetScale = this.isPoweredUp ? 0.2 * this.powerFactor : 0.2;
        particle.position.x += (Math.random() - 0.5) * offsetScale;
        particle.position.y += (Math.random() - 0.5) * offsetScale;
        particle.position.z += (Math.random() - 0.5) * offsetScale;
        
        // Longer lifetime for powered-up projectiles
        const lifetime = this.isPoweredUp ? 800 * this.powerFactor : 800;
        
        particle.creationTime = Date.now();
        particle.lifetime = lifetime;
        
        this.scene.add(particle);
        this.particles.push(particle);
        
        // Add a small light to each particle for better visibility
        const lightIntensity = this.isPoweredUp ? 0.5 * this.powerFactor : 0.5;
        const lightRange = this.isPoweredUp ? 3 * this.powerFactor : 3;
        
        const particleLight = new THREE.PointLight(
            particleColor,
            lightIntensity,
            lightRange
        );
        particleLight.position.copy(particle.position);
        particle.particleLight = particleLight;
        this.scene.add(particleLight);
    }
    
    updateTrailParticles() {
        const now = Date.now();
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            const age = now - particle.creationTime;
            
            if (age > particle.lifetime) {
                this.scene.remove(particle);
                if (particle.particleLight) {
                    this.scene.remove(particle.particleLight);
                }
                this.particles.splice(i, 1);
                continue;
            }
            
            // Fade out based on age
            const opacity = 1 - (age / particle.lifetime);
            particle.material.opacity = opacity;
            
            // Shrink based on age
            const scale = 1 - (age / particle.lifetime) * 0.8;
            particle.scale.set(scale, scale, scale);
            
            // Update particle light intensity if it exists
            if (particle.particleLight) {
                particle.particleLight.intensity = opacity * (this.isPoweredUp ? 0.5 * this.powerFactor : 0.5);
            }
        }
    }
    
    explode() {
        // Create explosion particles using utility function directly if no game reference
        let particleCount = this.isPoweredUp ? 20 * this.powerFactor : 20;
        let particleLifetime = this.isPoweredUp ? 1500 * this.powerFactor : 1500;
        
        // Determine explosion color based on power level
        let explosionColor;
        if (this.isFromPlayer && this.isPoweredUp) {
            // Power-up colors based on damage level
            const powerRatio = Math.min((this.powerFactor - 1) / 9, 1); // 0 to 1 scale
            explosionColor = new THREE.Color(1.0, 1.0 - powerRatio * 0.5, 0).getHex();
        } else {
            explosionColor = 0xFFAA00; // Default explosion color
        }
        
        if (this.game) {
            // Use the game's method to add debris particles
            this.game.addDebrisParticles(this.position, explosionColor, particleCount, particleLifetime);
        } else {
            // Fallback to direct creation
            createDebrisParticles(this.scene, this.position, explosionColor, particleCount, particleLifetime);
        }
        
        // Create a more dramatic flash effect
        let flashColor;
        if (this.isFromPlayer) {
            if (this.isPoweredUp) {
                // Power-up colors based on damage level
                const powerRatio = Math.min((this.powerFactor - 1) / 9, 1); // 0 to 1 scale
                flashColor = new THREE.Color(1.0, 1.0 - powerRatio * 0.7, 0).getHex();
            } else {
                flashColor = 0x00FFFF; // Normal player projectile (cyan)
            }
        } else {
            flashColor = 0xFF4400; // Enemy projectile (red-orange)
        }
        
        const flashIntensity = this.isPoweredUp ? 5 * this.powerFactor : 5;
        const flashRange = this.isPoweredUp ? 15 * this.powerFactor : 15;
        
        const flash = new THREE.PointLight(flashColor, flashIntensity, flashRange);
        flash.position.copy(this.position);
        this.scene.add(flash);
        
        // Create an explosion sphere for visual effect
        const explosionSize = this.isPoweredUp ? 2 * this.powerFactor : 2;
        const explosionGeometry = new THREE.SphereGeometry(explosionSize, 16, 16);
        const explosionMaterial = new THREE.MeshBasicMaterial({
            color: explosionColor,
            transparent: true,
            opacity: 0.8
        });
        const explosionSphere = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosionSphere.position.copy(this.position);
        this.scene.add(explosionSphere);
        
        // Animation scale factor based on power
        const scaleGrowth = this.isPoweredUp ? 0.1 * this.powerFactor : 0.1;
        const opacityDrop = this.isPoweredUp ? 0.05 / this.powerFactor : 0.05; // Slower fade for more powerful explosions
        
        // Animate the explosion sphere
        const animateExplosion = () => {
            // Larger explosion limit for powered-up projectiles
            const sizeLimit = this.isPoweredUp ? 2 * this.powerFactor : 2;
            
            if (explosionSphere.scale.x > sizeLimit) {
                this.scene.remove(explosionSphere);
                return;
            }
            
            explosionSphere.scale.x += scaleGrowth;
            explosionSphere.scale.y += scaleGrowth;
            explosionSphere.scale.z += scaleGrowth;
            explosionSphere.material.opacity -= opacityDrop;
            
            requestAnimationFrame(animateExplosion);
        };
        
        // Start the animation
        animateExplosion();
        
        // Flash duration scales with power
        const flashDuration = this.isPoweredUp ? 200 * this.powerFactor : 200;
        
        // Remove the flash and explosion after a short time
        setTimeout(() => {
            this.scene.remove(flash);
        }, flashDuration);
        
        // Remove projectile
        this.shouldRemove = true;
    }
    
    remove() {
        // Remove all particles and their lights
        for (const particle of this.particles) {
            this.scene.remove(particle);
            if (particle.particleLight) {
                this.scene.remove(particle.particleLight);
            }
        }
        
        // Remove the projectile and light
        this.scene.remove(this.mesh);
        this.scene.remove(this.light);
        
        // Remove motion blur if it exists
        if (this.motionBlur) {
            this.scene.remove(this.motionBlur);
        }
        
        // Clear the particles array
        this.particles = [];
    }
    
    // Update motion blur position and orientation
    updateMotionBlur() {
        if (!this.motionBlur) return;
        
        // Position the blur at the projectile's position
        this.motionBlur.position.copy(this.position);
        
        // Move it backward along the direction vector by half its length
        const blurOffset = this.isPoweredUp ? -1.0 * this.powerFactor : -1.0;
        const backOffset = this.direction.clone().multiplyScalar(blurOffset);
        this.motionBlur.position.add(backOffset);
        
        // Orient the blur along the movement direction
        const lookTarget = this.position.clone().add(this.direction);
        this.motionBlur.lookAt(lookTarget);
        
        // Rotate 90 degrees to properly align the cylinder
        this.motionBlur.rotateX(Math.PI / 2);
    }
} 