/**
 * Terrain class for creating the game world
 */
class Terrain {
    constructor(scene, size = 100, segments = 50) {
        this.scene = scene;
        this.size = size;
        this.segments = segments;
        this.boundarySize = size * 0.95; // Keep tanks inside this boundary
        
        this.createGround();
        this.createBoundary();
        this.createObstacles();
        this.createSkybox();
    }
    
    createGround() {
        // Create terrain using the utility function
        const groundGeometry = createTerrain(this.size, this.size, this.segments);
        
        // Create texture-based material
        const groundMaterial = new THREE.MeshPhongMaterial({
            color: 0x7B9971, // Greenish
            flatShading: true,
            shininess: 0
        });
        
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.scene.add(this.ground);
        
        // Create a highlighted boundary area on the ground
        const boundaryGeometry = new THREE.PlaneGeometry(this.boundarySize, this.boundarySize);
        const boundaryMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF6600, // Orange
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide
        });
        
        const boundaryPlane = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
        boundaryPlane.rotation.x = -Math.PI / 2; // Make it horizontal
        boundaryPlane.position.y = 0.05; // Just above the ground
        this.scene.add(boundaryPlane);
        
        // Add grid for visual reference (optional)
        const grid = new THREE.GridHelper(this.size, this.segments, 0x000000, 0x000000);
        grid.material.opacity = 0.1;
        grid.material.transparent = true;
        this.scene.add(grid);
    }
    
    createBoundary() {
        // Create boundary walls to keep tanks inside
        const wallHeight = 5;
        const wallThickness = 1;
        const wallMaterial = new THREE.MeshPhongMaterial({
            color: 0xFF6600, // Orange color for boundary walls
            flatShading: true,
            emissive: 0x882200, // Add some emissiveness for better visibility
            transparent: true,
            opacity: 0.8
        });
        
        // North wall
        const northWall = new THREE.Mesh(
            new THREE.BoxGeometry(this.size + wallThickness * 2, wallHeight, wallThickness),
            wallMaterial
        );
        northWall.position.set(0, wallHeight / 2, -this.size / 2 - wallThickness / 2);
        this.scene.add(northWall);
        
        // South wall
        const southWall = new THREE.Mesh(
            new THREE.BoxGeometry(this.size + wallThickness * 2, wallHeight, wallThickness),
            wallMaterial
        );
        southWall.position.set(0, wallHeight / 2, this.size / 2 + wallThickness / 2);
        this.scene.add(southWall);
        
        // East wall
        const eastWall = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness, wallHeight, this.size + wallThickness * 2),
            wallMaterial
        );
        eastWall.position.set(this.size / 2 + wallThickness / 2, wallHeight / 2, 0);
        this.scene.add(eastWall);
        
        // West wall
        const westWall = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness, wallHeight, this.size + wallThickness * 2),
            wallMaterial
        );
        westWall.position.set(-this.size / 2 - wallThickness / 2, wallHeight / 2, 0);
        this.scene.add(westWall);
        
        // Store walls for collision detection
        this.walls = [northWall, southWall, eastWall, westWall];
        
        // Create a perimeter line on the ground to mark the boundary
        const boundaryLineGeo = new THREE.EdgesGeometry(
            new THREE.PlaneGeometry(this.boundarySize, this.boundarySize)
        );
        const boundaryLineMat = new THREE.LineBasicMaterial({
            color: 0xFF6600, // Orange
            linewidth: 3 // Note: linewidth may not work on all browsers/platforms
        });
        const boundaryLine = new THREE.LineSegments(boundaryLineGeo, boundaryLineMat);
        boundaryLine.rotation.x = -Math.PI / 2; // Make it horizontal
        boundaryLine.position.y = 0.1; // Slightly above ground
        this.scene.add(boundaryLine);
    }
    
    createObstacles() {
        this.obstacles = [];
        
        // Create some random box obstacles
        for (let i = 0; i < 15; i++) {
            const size = randomBetween(3, 7);
            const height = randomBetween(2, 6);
            
            const obstacleGeometry = new THREE.BoxGeometry(size, height, size);
            const obstacleMaterial = new THREE.MeshPhongMaterial({
                color: new THREE.Color(
                    randomBetween(0.3, 0.6),
                    randomBetween(0.3, 0.6),
                    randomBetween(0.3, 0.6)
                ),
                emissive: new THREE.Color(0.1, 0.1, 0.1),
                shininess: 30
            });
            
            const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
            
            // Random position but not too close to center (player spawn)
            let x, z;
            do {
                x = randomBetween(-this.size / 2 + 10, this.size / 2 - 10);
                z = randomBetween(-this.size / 2 + 10, this.size / 2 - 10);
            } while (Math.sqrt(x * x + z * z) < 15); // Not too close to center
            
            obstacle.position.set(x, height / 2, z);
            
            // Add to scene and to obstacles array for collision detection
            this.scene.add(obstacle);
            this.obstacles.push(obstacle);
            
            // Add radius for collision detection
            obstacle.radius = Math.max(size, size) / 2;
            
            // Tag this as an obstacle for AI detection
            obstacle.userData = { isObstacle: true };
        }
        
        // Create some rock formations (spheres)
        for (let i = 0; i < 10; i++) {
            const radius = randomBetween(1.5, 4);
            
            const rockGeometry = new THREE.SphereGeometry(radius, 10, 10);
            const rockMaterial = new THREE.MeshPhongMaterial({
                color: 0x777777,
                emissive: 0x222222,
                flatShading: true,
                shininess: 20
            });
            
            const rock = new THREE.Mesh(rockGeometry, rockMaterial);
            
            // Random position but not too close to center (player spawn)
            let x, z;
            do {
                x = randomBetween(-this.size / 2 + 10, this.size / 2 - 10);
                z = randomBetween(-this.size / 2 + 10, this.size / 2 - 10);
            } while (Math.sqrt(x * x + z * z) < 15); // Not too close to center
            
            rock.position.set(x, radius, z);
            
            // Add to scene and to obstacles array for collision detection
            this.scene.add(rock);
            this.obstacles.push(rock);
            
            // Add radius for collision detection
            rock.radius = radius;
            
            // Tag this as an obstacle for AI detection
            rock.userData = { isObstacle: true };
        }
    }
    
    createSkybox() {
        // Create a simple skybox
        const skyboxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
        const skyboxMaterials = [
            new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // Right
            new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // Left
            new THREE.MeshBasicMaterial({ color: 0x6495ED, side: THREE.BackSide }), // Top (darker blue for top)
            new THREE.MeshBasicMaterial({ color: 0x8FBC8F, side: THREE.BackSide }), // Bottom (greenish for ground reflection)
            new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // Front
            new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide })  // Back
        ];
        
        const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterials);
        this.scene.add(skybox);
    }
    
    checkCollision(object) {
        // Check collision with walls (boundary)
        if (Math.abs(object.position.x) > this.boundarySize / 2 ||
            Math.abs(object.position.z) > this.boundarySize / 2) {
            
            // Return detailed collision information
            return {
                collided: true,
                type: 'boundary',
                direction: this.getBoundaryCollisionDirection(object.position),
                position: object.position.clone()
            };
        }
        
        // Check collision with obstacles
        for (const obstacle of this.obstacles) {
            const dist = distance(object.position, obstacle.position);
            if (dist < (object.radius || 0) + obstacle.radius) {
                // Return obstacle collision
                return {
                    collided: true,
                    type: 'obstacle',
                    obstacle: obstacle,
                    position: object.position.clone()
                };
            }
        }
        
        // No collision
        return {
            collided: false
        };
    }
    
    getBoundaryCollisionDirection(position) {
        // Determine which boundary was crossed
        const direction = new THREE.Vector3();
        
        if (position.x > this.boundarySize / 2) {
            direction.x = -1; // Crossed right boundary, push left
        } else if (position.x < -this.boundarySize / 2) {
            direction.x = 1;  // Crossed left boundary, push right
        }
        
        if (position.z > this.boundarySize / 2) {
            direction.z = -1; // Crossed front boundary, push back
        } else if (position.z < -this.boundarySize / 2) {
            direction.z = 1;  // Crossed back boundary, push forward
        }
        
        return direction;
    }
    
    // Helper function to keep object within boundaries
    keepWithinBoundaries(object) {
        // Clamp position within boundaries
        object.position.x = Math.max(-this.boundarySize / 2, Math.min(this.boundarySize / 2, object.position.x));
        object.position.z = Math.max(-this.boundarySize / 2, Math.min(this.boundarySize / 2, object.position.z));
        
        return object.position;
    }
    
    // Handle obstacle collisions by pushing the object away
    handleObstacleCollision(object, obstacle) {
        // Calculate direction from obstacle to object
        const pushDirection = new THREE.Vector3()
            .subVectors(object.position, obstacle.position)
            .normalize();
        
        // Calculate minimal distance needed to resolve the collision
        const minDistance = obstacle.radius + (object.radius || 1.5);
        const actualDistance = distance(object.position, obstacle.position);
        const pushAmount = minDistance - actualDistance + 0.1; // Add a small buffer
        
        // Push the object away from the obstacle
        if (pushAmount > 0) {
            const pushVector = pushDirection.multiplyScalar(pushAmount);
            object.position.add(pushVector);
            return true;
        }
        
        return false;
    }
} 