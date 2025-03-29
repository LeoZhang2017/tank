/**
 * Coin class for collectible power-up items
 */
class Coin {
    constructor(scene, position) {
        this.scene = scene;
        this.isCollected = false;
        this.collectionTime = 0;
        this.collectionAnimationDuration = 1000; // ms
        this.radius = 1.0; // Increased for better collision detection
        this.rotationSpeed = 3;
        this.floatHeight = 0.5;
        this.floatSpeed = 1.5;
        
        // Create a position reference for easier access
        this.position = position.clone();
        
        // Create the coin mesh
        const geometry = new THREE.CylinderGeometry(1.2, 1.2, 0.2, 32);
        const material = new THREE.MeshPhongMaterial({
            color: 0xFFD700, // Gold color
            emissive: 0xFF9500,
            emissiveIntensity: 1.0,
            shininess: 100,
            specular: 0xFFFFFF
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.position.y = 1.5; // Positioned above the ground
        this.mesh.rotation.x = Math.PI / 2; // Make the cylinder flat (like a coin)
        
        // Add to scene
        scene.add(this.mesh);
        
        // Add a point light to make the coin glow
        this.light = new THREE.PointLight(0xFFD700, 1, 5);
        this.light.position.copy(this.mesh.position);
        scene.add(this.light);
        
        // Add a pulsing light for more dramatic effect
        this.pulseLight = new THREE.PointLight(0xFFD700, 0.5, 3);
        this.pulseLight.position.copy(this.mesh.position);
        scene.add(this.pulseLight);
        
        // Create particles that orbit the coin
        this.createParticles();
        
        // Initial state for floating animation
        this.floatOffset = Math.random() * Math.PI * 2;
    }
    
    createParticles() {
        // Create small particles that orbit around the coin
        this.particles = [];
        const particleCount = 10;
        
        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(0.1, 8, 8);
            const material = new THREE.MeshBasicMaterial({
                color: 0xFFD700,
                transparent: true,
                opacity: 0.7
            });
            
            const particle = new THREE.Mesh(geometry, material);
            
            // Set initial position in a circle around the coin
            const angle = (i / particleCount) * Math.PI * 2;
            const radius = 1.5;
            particle.position.set(
                this.position.x + Math.cos(angle) * radius,
                this.position.y + 1.5,
                this.position.z + Math.sin(angle) * radius
            );
            
            // Store the orbit angle for animation
            particle.angle = angle;
            particle.orbitSpeed = 0.5 + Math.random() * 0.5; // Random speed
            
            this.scene.add(particle);
            this.particles.push(particle);
        }
    }
    
    update(deltaTime) {
        if (!this.isCollected) {
            // Rotate the coin
            this.mesh.rotation.z += this.rotationSpeed * deltaTime;
            
            // Make the coin float up and down
            const floatY = Math.sin(this.floatOffset + Date.now() * 0.002) * this.floatHeight;
            this.mesh.position.y = this.position.y + 1.5 + floatY;
            
            // Update the light position to match the coin
            this.light.position.copy(this.mesh.position);
            
            // Pulse the secondary light
            const pulseIntensity = 0.5 + 0.5 * Math.sin(Date.now() * 0.005);
            this.pulseLight.intensity = pulseIntensity;
            this.pulseLight.position.copy(this.mesh.position);
            
            // Update particles orbiting the coin
            for (let i = 0; i < this.particles.length; i++) {
                const particle = this.particles[i];
                
                // Update orbit position
                particle.angle += particle.orbitSpeed * deltaTime;
                const radius = 1.5;
                
                particle.position.set(
                    this.position.x + Math.cos(particle.angle) * radius,
                    this.position.y + 1.5 + floatY,
                    this.position.z + Math.sin(particle.angle) * radius
                );
            }
        } else {
            // Collection animation - move upward and scale down
            const timeSinceCollection = Date.now() - this.collectionTime;
            const progress = Math.min(timeSinceCollection / this.collectionAnimationDuration, 1);
            
            // Move upward faster (increased speed)
            this.mesh.position.y += 8 * deltaTime;
            
            // Scale down
            const scale = 1 - progress * 0.9;
            this.mesh.scale.set(scale, scale, scale);
            
            // Update light
            this.light.position.copy(this.mesh.position);
            this.light.intensity = 1 - progress;
            
            this.pulseLight.position.copy(this.mesh.position);
            this.pulseLight.intensity = (1 - progress) * 0.5;
            
            // Update particles
            for (let i = 0; i < this.particles.length; i++) {
                const particle = this.particles[i];
                
                // Move particles upward with the coin but spread outward
                particle.position.y += 8 * deltaTime;
                
                // Spread outward as they move up
                const spreadFactor = 5 * progress;
                const angle = particle.angle;
                const spreadX = Math.cos(angle) * spreadFactor;
                const spreadZ = Math.sin(angle) * spreadFactor;
                
                particle.position.x = this.mesh.position.x + spreadX;
                particle.position.z = this.mesh.position.z + spreadZ;
                
                // Fade out
                particle.material.opacity = 0.7 * (1 - progress);
            }
            
            // If animation is complete, remove particles
            if (progress >= 1) {
                this.removeParticles();
            }
        }
    }
    
    collect() {
        if (this.isCollected) return;
        
        this.isCollected = true;
        this.collectionTime = Date.now();
        
        // Play collection sound
        this.playCollectionSound();
    }
    
    playCollectionSound() {
        // Simple collection sound using Web Audio API
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioCtx();
            
            // Create a coin collection sound
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.2);
        }
    }
    
    removeParticles() {
        // Remove all particles from the scene
        for (const particle of this.particles) {
            this.scene.remove(particle);
        }
        this.particles = [];
    }
    
    remove() {
        // Remove from scene
        this.scene.remove(this.mesh);
        this.scene.remove(this.light);
        this.scene.remove(this.pulseLight);
        
        // Remove particles
        this.removeParticles();
    }
} 