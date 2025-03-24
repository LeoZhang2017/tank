/**
 * Projectile class for tank shells
 */
class Projectile {
    constructor(scene, position, direction, isFromPlayer = true, game = null) {
        this.scene = scene;
        this.isFromPlayer = isFromPlayer;
        this.speed = 50;
        this.damage = 25;
        this.lifetime = 3000; // milliseconds
        this.creationTime = Date.now();
        this.shouldRemove = false;
        this.radius = 0.5; // Increased for collision detection
        this.game = game; // Reference to the game instance for debris particles
        
        // Create projectile mesh
        const geometry = new THREE.SphereGeometry(0.8, 12, 12); // Increased size and detail
        const material = new THREE.MeshPhongMaterial({
            color: isFromPlayer ? 0x00FFFF : 0xFF4400,
            emissive: isFromPlayer ? 0x00AAAA : 0xAA2200,
            shininess: 50,
            emissiveIntensity: 1.5
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
        const blurLength = 2.0;
        const blurGeometry = new THREE.CylinderGeometry(0.5, 0.5, blurLength, 8);
        const blurMaterial = new THREE.MeshBasicMaterial({
            color: isFromPlayer ? 0x00FFFF : 0xFF4400,
            transparent: true,
            opacity: 0.4
        });
        this.motionBlur = new THREE.Mesh(blurGeometry, blurMaterial);
        this.motionBlur.rotation.x = Math.PI / 2; // Orient along z-axis
        this.scene.add(this.motionBlur);
        
        // Position the motion blur behind the projectile
        this.updateMotionBlur();
        
        // Add a point light to make it glow
        this.light = new THREE.PointLight(
            isFromPlayer ? 0x00FFFF : 0xFF4400,
            2.5, // Increased light intensity
            12   // Increased light range
        );
        this.light.position.copy(position);
        scene.add(this.light);
        
        // Add trail particles
        this.particles = [];
        this.lastParticleTime = 0;
        this.particleFrequency = 20; // ms between particles (more frequent)
        
        // Debug
        console.log("Projectile created at", position.clone(), "with direction", direction.clone());
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
        const geometry = new THREE.SphereGeometry(0.4, 8, 8); // Larger trail particles
        const material = new THREE.MeshBasicMaterial({
            color: this.isFromPlayer ? 0x00FFFF : 0xFF4400,
            transparent: true,
            opacity: 0.7
        });
        
        const particle = new THREE.Mesh(geometry, material);
        particle.position.copy(this.position);
        
        // Add small random offset to create a wider trail
        particle.position.x += (Math.random() - 0.5) * 0.2;
        particle.position.y += (Math.random() - 0.5) * 0.2;
        particle.position.z += (Math.random() - 0.5) * 0.2;
        
        particle.creationTime = Date.now();
        particle.lifetime = 800; // longer lifetime for better visibility
        
        this.scene.add(particle);
        this.particles.push(particle);
        
        // Add a small light to each particle for better visibility
        const particleLight = new THREE.PointLight(
            this.isFromPlayer ? 0x00FFFF : 0xFF4400,
            0.5,
            3
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
                particle.particleLight.intensity = opacity * 0.5;
            }
        }
    }
    
    explode() {
        // Create explosion particles using utility function directly if no game reference
        if (this.game) {
            // Use the game's method to add debris particles
            // More particles for a more visible explosion
            this.game.addDebrisParticles(this.position, 0xFFAA00, 20, 1500);
        } else {
            // Fallback to direct creation
            createDebrisParticles(this.scene, this.position, 0xFFAA00, 20, 1500);
        }
        
        // Create a more dramatic flash effect
        const flashColor = this.isFromPlayer ? 0x00FFFF : 0xFF4400;
        const flash = new THREE.PointLight(flashColor, 5, 15);
        flash.position.copy(this.position);
        this.scene.add(flash);
        
        // Create an explosion sphere for visual effect
        const explosionGeometry = new THREE.SphereGeometry(2, 16, 16);
        const explosionMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFAA00,
            transparent: true,
            opacity: 0.8
        });
        const explosionSphere = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosionSphere.position.copy(this.position);
        this.scene.add(explosionSphere);
        
        // Animate the explosion sphere
        const animateExplosion = () => {
            if (explosionSphere.scale.x > 2) {
                this.scene.remove(explosionSphere);
                return;
            }
            
            explosionSphere.scale.x += 0.1;
            explosionSphere.scale.y += 0.1;
            explosionSphere.scale.z += 0.1;
            explosionSphere.material.opacity -= 0.05;
            
            requestAnimationFrame(animateExplosion);
        };
        
        // Start the animation
        animateExplosion();
        
        // Remove the flash and explosion after a short time
        setTimeout(() => {
            this.scene.remove(flash);
        }, 200);
        
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
        const backOffset = this.direction.clone().multiplyScalar(-1.0);
        this.motionBlur.position.add(backOffset);
        
        // Orient the blur along the movement direction
        const lookTarget = this.position.clone().add(this.direction);
        this.motionBlur.lookAt(lookTarget);
        
        // Rotate 90 degrees to properly align the cylinder
        this.motionBlur.rotateX(Math.PI / 2);
    }
} 