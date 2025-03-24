/**
 * Utility functions for the 3D Tank Game
 */

// Generate a random number between min and max (inclusive)
function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

// Generate a random integer between min and max (inclusive)
function randomIntBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Calculate distance between two 3D points
function distance(point1, point2) {
    return Math.sqrt(
        Math.pow(point2.x - point1.x, 2) +
        Math.pow(point2.y - point1.y, 2) +
        Math.pow(point2.z - point1.z, 2)
    );
}

// Check if two objects are colliding (simple radius-based collision)
function checkCollision(obj1, obj2) {
    const dist = distance(obj1.position, obj2.position);
    return dist < (obj1.radius + obj2.radius);
}

// Clamp a value between min and max
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// Convert degrees to radians
function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}

// Convert radians to degrees
function radToDeg(radians) {
    return radians * (180 / Math.PI);
}

// Create a simple debris particle system at a position
function createDebrisParticles(scene, position, color, count = 15, lifetime = 2000) {
    const particles = [];
    
    for (let i = 0; i < count; i++) {
        const geometry = new THREE.SphereGeometry(randomBetween(0.1, 0.3), 4, 4);
        const material = new THREE.MeshBasicMaterial({ color: color });
        const particle = new THREE.Mesh(geometry, material);
        
        // Set position
        particle.position.copy(position);
        
        // Set random velocity
        particle.velocity = new THREE.Vector3(
            randomBetween(-5, 5),
            randomBetween(2, 8),
            randomBetween(-5, 5)
        );
        
        // Set creation time
        particle.creationTime = Date.now();
        particle.lifetime = lifetime;
        
        scene.add(particle);
        particles.push(particle);
    }
    
    return particles;
}

// Update debris particles
function updateDebrisParticles(particles, scene) {
    const now = Date.now();
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        const age = now - particle.creationTime;
        
        if (age > particle.lifetime) {
            scene.remove(particle);
            particles.splice(i, 1);
            continue;
        }
        
        particle.velocity.y -= 0.1; // Gravity
        particle.position.add(particle.velocity.clone().multiplyScalar(0.016)); // Apply velocity
        
        // Fade out based on age
        const opacity = 1 - (age / particle.lifetime);
        particle.material.opacity = opacity;
        particle.material.transparent = true;
    }
}

// Create a terrain with hills and valleys
function createTerrain(width, height, segments, heightMap = null) {
    const geometry = new THREE.PlaneGeometry(width, height, segments, segments);
    geometry.rotateX(-Math.PI / 2); // Rotate to be horizontal
    
    const vertices = geometry.attributes.position.array;
    
    // If no height map is provided, generate random terrain
    if (!heightMap) {
        for (let i = 0; i < vertices.length; i += 3) {
            // Skip the edges to keep them flat (for boundary)
            const x = Math.floor((i / 3) % (segments + 1));
            const z = Math.floor((i / 3) / (segments + 1));
            
            if (x > 0 && x < segments && z > 0 && z < segments) {
                vertices[i + 1] = randomBetween(-2, 2); // Y is up in Three.js
            }
        }
    } else {
        // Use provided height map
        for (let i = 0; i < vertices.length; i += 3) {
            const x = Math.floor((i / 3) % (segments + 1));
            const z = Math.floor((i / 3) / (segments + 1));
            
            if (x >= 0 && x < heightMap.length && z >= 0 && z < heightMap[0].length) {
                vertices[i + 1] = heightMap[x][z];
            }
        }
    }
    
    geometry.computeVertexNormals();
    
    return geometry;
} 