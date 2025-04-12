/**
 * Coin class for collectible power-up items
 */
class Coin {
    constructor(scene, position) {
        this.scene = scene;
        this.isCollected = false;
        this.collectionTime = 0;
        this.collectionAnimationDuration = 1000; // ms
        this.radius = 1.5; // Increased for better collision detection and visibility
        this.rotationSpeed = 3;
        this.floatHeight = 0.8; // Increased float height for better visibility
        this.floatSpeed = 1.5;
        
        // Create a position reference for easier access
        this.position = position.clone();
        
        // Create the coin mesh
        const geometry = new THREE.CylinderGeometry(1.8, 1.8, 0.3, 32); // Bigger coin
        const material = new THREE.MeshPhongMaterial({
            color: 0xFFD700, // Gold color
            emissive: 0xFF9500,
            emissiveIntensity: 2.0, // Doubled intensity
            shininess: 100,
            specular: 0xFFFFFF
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.position.y = 3.0; // Position higher above ground for better visibility
        this.mesh.rotation.x = Math.PI / 2; // Make the cylinder flat (like a coin)
        
        // Add to scene
        scene.add(this.mesh);
        
        // Add a point light to make the coin glow
        this.light = new THREE.PointLight(0xFFD700, 2.5, 12); // Brighter light with larger range
        this.light.position.copy(this.mesh.position);
        scene.add(this.light);
        
        // Add a pulsing light for more dramatic effect
        this.pulseLight = new THREE.PointLight(0xFFD700, 1.0, 6); // Brighter pulsing light
        this.pulseLight.position.copy(this.mesh.position);
        scene.add(this.pulseLight);
        
        // Create particles that orbit the coin
        this.createParticles();
        
        // Create a glow effect around the coin
        this.createGlowEffect();
        
        // Create a vertical beam of light
        this.createLightBeam();
        
        // Initial state for floating animation
        this.floatOffset = Math.random() * Math.PI * 2;
        
        // Add a small spotlight from above to highlight the coin
        this.spotlight = new THREE.SpotLight(0xFFFFFF, 2, 25, Math.PI/4, 0.5); // Brighter spotlight
        this.spotlight.position.set(position.x, position.y + 15, position.z);
        this.spotlight.target = this.mesh;
        this.spotlight.castShadow = true;
        scene.add(this.spotlight);
        
        // Scale the entire coin and its effects up by 50%
        this.mesh.scale.set(1.5, 1.5, 1.5);
        
        console.log(`Coin created at position: ${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}`);
    }
    
    createLightBeam() {
        // Create a vertical beam of light using a cylinder
        const beamGeometry = new THREE.CylinderGeometry(0.5, 0.5, 50, 16);
        const beamMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFF00,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        
        this.lightBeam = new THREE.Mesh(beamGeometry, beamMaterial);
        this.lightBeam.position.copy(this.position);
        this.lightBeam.position.y += 25; // Center of the beam is 25 units up
        this.scene.add(this.lightBeam);
        
        // Add a ring at the base of the beam
        const ringGeometry = new THREE.TorusGeometry(2, 0.4, 16, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFF00,
            transparent: true,
            opacity: 0.7
        });
        
        this.groundRing = new THREE.Mesh(ringGeometry, ringMaterial);
        this.groundRing.position.copy(this.position);
        this.groundRing.position.y = 0.4; // Just above the ground
        this.groundRing.rotation.x = Math.PI / 2; // Flat on the ground
        this.scene.add(this.groundRing);
    }
    
    createGlowEffect() {
        // Create a larger, transparent cylinder to act as a glow around the coin
        const glowGeometry = new THREE.CylinderGeometry(3.0, 3.0, 0.1, 32); // Larger glow
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: 0.5, // More visible
            side: THREE.DoubleSide
        });
        
        this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        this.glowMesh.position.copy(this.mesh.position);
        this.glowMesh.rotation.x = Math.PI / 2; // Same orientation as coin
        this.scene.add(this.glowMesh);
        
        // Add a rim effect that's visible from all angles
        const rimGeometry = new THREE.TorusGeometry(2.0, 0.3, 16, 32); // Larger rim
        const rimMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFF00,
            transparent: true,
            opacity: 0.9 // More visible
        });
        
        this.rimMesh = new THREE.Mesh(rimGeometry, rimMaterial);
        this.rimMesh.position.copy(this.mesh.position);
        this.rimMesh.rotation.x = Math.PI / 2; // Orient like the coin
        this.scene.add(this.rimMesh);
    }
    
    createParticles() {
        // Create small particles that orbit around the coin
        this.particles = [];
        const particleCount = 20; // More particles
        
        for (let i = 0; i < particleCount; i++) {
            // Create a small sphere for each particle
            const particleSize = 0.25 + Math.random() * 0.15; // Larger particles
            const geometry = new THREE.SphereGeometry(particleSize, 8, 8);
            
            // Alternate between gold and white particles for better effect
            const color = (i % 2 === 0) ? 0xFFD700 : 0xFFFFFF;
            
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.9 // More visible
            });
            
            const particle = new THREE.Mesh(geometry, material);
            
            // Set initial position in a circle around the coin
            const angle = (i / particleCount) * Math.PI * 2;
            const radius = 2.2 + Math.random() * 0.8; // Larger orbit radius
            particle.position.set(
                this.position.x + Math.cos(angle) * radius,
                this.position.y + 3.0, // Same height as coin's initial position
                this.position.z + Math.sin(angle) * radius
            );
            
            // Store the orbit angle for animation
            particle.angle = angle;
            particle.orbitSpeed = 0.8 + Math.random() * 1.0; // Faster orbiting
            particle.vertOffset = Math.random() * 0.8; // More vertical movement
            
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
            this.mesh.position.y = this.position.y + 3.0 + floatY;
            
            // Update the light position to match the coin
            this.light.position.copy(this.mesh.position);
            
            // Pulse the secondary light
            const pulseIntensity = 1.0 + 1.0 * Math.sin(Date.now() * 0.005); // More intense pulse
            this.pulseLight.intensity = pulseIntensity;
            this.pulseLight.position.copy(this.mesh.position);
            
            // Update the glow and rim effects
            if (this.glowMesh) {
                this.glowMesh.position.copy(this.mesh.position);
                // Make the glow pulse by changing its scale
                const glowPulse = 1.0 + 0.3 * Math.sin(Date.now() * 0.003);
                this.glowMesh.scale.set(glowPulse, 1, glowPulse);
            }
            
            if (this.rimMesh) {
                this.rimMesh.position.copy(this.mesh.position);
                // Rotate the rim for additional effect
                this.rimMesh.rotation.z += 2.0 * deltaTime;
            }
            
            // Update the light beam
            if (this.lightBeam) {
                // Make the beam pulse by changing opacity
                this.lightBeam.material.opacity = 0.2 + 0.2 * Math.sin(Date.now() * 0.002);
                
                // Make the beam rotate slowly
                this.lightBeam.rotation.y += 0.2 * deltaTime;
            }
            
            // Update ground ring
            if (this.groundRing) {
                // Make the ring pulse
                const ringPulse = 1.0 + 0.3 * Math.sin(Date.now() * 0.003);
                this.groundRing.scale.set(ringPulse, ringPulse, 1);
                
                // Make the ring rotate
                this.groundRing.rotation.z += 1.0 * deltaTime;
            }
            
            // Update particles orbiting the coin
            for (let i = 0; i < this.particles.length; i++) {
                const particle = this.particles[i];
                
                // Update orbit position with 3D movement
                particle.angle += particle.orbitSpeed * deltaTime;
                const radius = 2.2 + 0.5 * Math.sin(particle.angle * 0.5); // Pulsing radius
                
                // Create a more interesting 3D orbit pattern
                const vertPos = Math.sin(particle.angle * 2) * particle.vertOffset;
                
                particle.position.set(
                    this.position.x + Math.cos(particle.angle) * radius,
                    this.position.y + 3.0 + floatY + vertPos,
                    this.position.z + Math.sin(particle.angle) * radius
                );
                
                // Pulse particle opacity for subtle effect
                particle.material.opacity = 0.7 + 0.3 * Math.sin(Date.now() * 0.002 + i);
                
                // Make particles glow by scaling
                const particlePulse = 1.0 + 0.2 * Math.sin(Date.now() * 0.003 + i * 0.5);
                particle.scale.set(particlePulse, particlePulse, particlePulse);
            }
            
            // Update spotlight to follow coin
            if (this.spotlight) {
                this.spotlight.position.set(this.mesh.position.x, this.mesh.position.y + 15, this.mesh.position.z);
                
                // Make spotlight intensity pulse
                this.spotlight.intensity = 1.5 + 0.5 * Math.sin(Date.now() * 0.002);
            }
        } else {
            // Collection animation - move upward and scale down
            const timeSinceCollection = Date.now() - this.collectionTime;
            const progress = Math.min(timeSinceCollection / this.collectionAnimationDuration, 1);
            
            // Move upward faster (increased speed)
            this.mesh.position.y += 10 * deltaTime;
            
            // Scale down
            const scale = 1 - progress * 0.9;
            this.mesh.scale.set(scale, scale, scale);
            
            // Update light
            this.light.position.copy(this.mesh.position);
            this.light.intensity = 2.5 * (1 - progress);
            
            this.pulseLight.position.copy(this.mesh.position);
            this.pulseLight.intensity = 1.0 * (1 - progress);
            
            // Update glow effects
            if (this.glowMesh) {
                this.glowMesh.position.copy(this.mesh.position);
                this.glowMesh.scale.set(scale * 1.5, scale, scale * 1.5);
                this.glowMesh.material.opacity = 0.5 * (1 - progress);
            }
            
            if (this.rimMesh) {
                this.rimMesh.position.copy(this.mesh.position);
                this.rimMesh.scale.set(scale, scale, scale);
                this.rimMesh.material.opacity = 0.9 * (1 - progress);
            }
            
            // Update light beam
            if (this.lightBeam) {
                this.lightBeam.material.opacity = 0.3 * (1 - progress);
                // Shrink the beam as the coin is collected
                this.lightBeam.scale.set(1 - progress * 0.8, 1 - progress, 1 - progress * 0.8);
            }
            
            // Update ground ring
            if (this.groundRing) {
                this.groundRing.material.opacity = 0.7 * (1 - progress);
                // Expand the ring as the coin is collected
                const ringScale = 1 + progress * 2;
                this.groundRing.scale.set(ringScale, ringScale, 1);
            }
            
            // Update spotlight
            if (this.spotlight) {
                this.spotlight.position.set(this.mesh.position.x, this.mesh.position.y + 15, this.mesh.position.z);
                this.spotlight.intensity = 2 * (1 - progress);
            }
            
            // Update particles
            for (let i = 0; i < this.particles.length; i++) {
                const particle = this.particles[i];
                
                // Move particles upward with the coin but spread outward
                particle.position.y += 10 * deltaTime;
                
                // Spread outward as they move up
                const spreadFactor = 8 * progress; // Wider spread
                const angle = particle.angle;
                const spreadX = Math.cos(angle) * spreadFactor;
                const spreadZ = Math.sin(angle) * spreadFactor;
                
                particle.position.x = this.mesh.position.x + spreadX;
                particle.position.z = this.mesh.position.z + spreadZ;
                
                // Fade out
                particle.material.opacity = 0.9 * (1 - progress);
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
        
        console.log("Coin collected!");
    }
    
    playCollectionSound() {
        // Simple collection sound using Web Audio API
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioCtx();
            
            // Create a coin collection sound - made more distinct
            const oscillator1 = audioCtx.createOscillator();
            const oscillator2 = audioCtx.createOscillator();
            const oscillator3 = audioCtx.createOscillator(); // Added third oscillator for richer sound
            const gainNode = audioCtx.createGain();
            
            // First tone - higher pitch
            oscillator1.type = 'sine';
            oscillator1.frequency.setValueAtTime(800, audioCtx.currentTime);
            oscillator1.frequency.exponentialRampToValueAtTime(1600, audioCtx.currentTime + 0.15);
            
            // Second tone for richness
            oscillator2.type = 'triangle';
            oscillator2.frequency.setValueAtTime(1000, audioCtx.currentTime + 0.05);
            oscillator2.frequency.exponentialRampToValueAtTime(2000, audioCtx.currentTime + 0.2);
            
            // Third tone for more presence
            oscillator3.type = 'square';
            oscillator3.frequency.setValueAtTime(400, audioCtx.currentTime);
            oscillator3.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
            
            // Envelope
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            
            // Connect nodes
            oscillator1.connect(gainNode);
            oscillator2.connect(gainNode);
            oscillator3.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            // Play sound
            oscillator1.start();
            oscillator2.start();
            oscillator3.start();
            oscillator1.stop(audioCtx.currentTime + 0.4);
            oscillator2.stop(audioCtx.currentTime + 0.4);
            oscillator3.stop(audioCtx.currentTime + 0.4);
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
        
        // Remove glow effects
        if (this.glowMesh) {
            this.scene.remove(this.glowMesh);
        }
        
        if (this.rimMesh) {
            this.scene.remove(this.rimMesh);
        }
        
        // Remove spotlight
        if (this.spotlight) {
            this.scene.remove(this.spotlight);
        }
        
        // Remove light beam and ground ring
        if (this.lightBeam) {
            this.scene.remove(this.lightBeam);
        }
        
        if (this.groundRing) {
            this.scene.remove(this.groundRing);
        }
        
        // Remove particles
        this.removeParticles();
        
        console.log("Coin resources removed from scene");
    }
} 