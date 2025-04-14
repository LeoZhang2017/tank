/**
 * Terrain class for creating the game world
 */
class Terrain {
    constructor(scene, size = 100, segments = 64) {
        this.scene = scene;
        this.size = size;
        this.segments = segments;
        this.boundarySize = size * 0.95; // Keep tanks inside this boundary
        
        // Set Minecraft terrain options
        this.minecraftOptions = {
            blockSize: 2,             // Size of each block
            baseHeight: 0,            // Base terrain height
            heightVariation: 3,       // How much height can vary
            noiseScale: 0.08,         // Scale of the terrain noise
            biomeNoiseScale: 0.03,    // Scale of biome variation
            seed: Math.random(),      // Random seed value
            waterLevel: -0.5,         // Level where water starts
            dirtThickness: 3,         // Thickness of dirt layer
            valleyHeight: -2,         // Lowest point in valleys
            flatCenter: true,         // Keep center flat for gameplay
            centerRadius: 20,         // Radius of flat center area
            rivers: true,             // Whether to add rivers/water channels
            flowers: true             // Whether to add flowers
        };
        
        this.createGround();
        this.createWater();
        this.createFlowers();
        this.createBoundary();
        this.createObstacles();
        this.createSkybox();
        this.createMinecraftTrees();
    }
    
    // Add internal distance calculation method to avoid dependency on global distance function
    calculateDistance(point1, point2) {
        return Math.sqrt(
            Math.pow(point2.x - point1.x, 2) +
            Math.pow(point2.y - point1.y, 2) +
            Math.pow(point2.z - point1.z, 2)
        );
    }
    
    createGround() {
        // Create Minecraft-style terrain using the new function
        const groundGeometry = createMinecraftTerrain(
            this.size, 
            this.size, 
            this.segments, 
            this.minecraftOptions
        );
        
        // Create custom material for Minecraft terrain
        const groundMaterial = new THREE.MeshLambertMaterial({
            vertexColors: true    // Use vertex colors from terrain
        });
        
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.scene.add(this.ground);
        
        // Store terrain data for gameplay
        this.blockPositions = groundGeometry.userData.blockPositions;
        this.flowerPositions = groundGeometry.userData.flowerPositions;
        this.waterPositions = groundGeometry.userData.waterPositions;
        this.waterLevel = groundGeometry.userData.waterLevel;
        
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
    }
    
    createWater() {
        // Create water surface for rivers and lakes
        if (!this.waterPositions || this.waterPositions.length === 0) return;
        
        // Create a single water plane that covers the whole map at water level
        const waterGeometry = new THREE.PlaneGeometry(this.size, this.size, 1, 1);
        const waterMaterial = new THREE.MeshLambertMaterial({
            color: 0x3D6DF2,       // Blue water color
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide // Visible from below
        });
        
        const waterPlane = new THREE.Mesh(waterGeometry, waterMaterial);
        waterPlane.rotation.x = -Math.PI / 2; // Make it horizontal
        waterPlane.position.y = this.waterLevel + 0.1; // Slightly above water level to avoid z-fighting
        this.scene.add(waterPlane);
        
        // Animate water
        this.water = waterPlane;
        
        // Add underwater color effect
        const underwaterLightGeometry = new THREE.PlaneGeometry(this.size, this.size);
        const underwaterLightMaterial = new THREE.MeshBasicMaterial({
            color: 0x0055FF,
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
        });
        
        const underwaterLight = new THREE.Mesh(underwaterLightGeometry, underwaterLightMaterial);
        underwaterLight.rotation.x = -Math.PI / 2;
        underwaterLight.position.y = this.waterLevel - 0.1;
        this.scene.add(underwaterLight);
    }
    
    createFlowers() {
        if (!this.flowerPositions || this.flowerPositions.length === 0) return;
        
        // Define flower colors
        const flowerColors = [
            0xFFFF00, // Yellow
            0xFF0000, // Red  
            0xFFFFFF, // White
            0xF0C1F4  // Light purple
        ];
        
        // Create instanced meshes for flowers
        const flowerCount = this.flowerPositions.length;
        
        // Create simple cross geometry for flowers
        const stemGeometry = new THREE.BoxGeometry(0.1, 0.8, 0.1);
        stemGeometry.translate(0, 0.4, 0); // Move pivot to bottom
        
        const petalGeometry = new THREE.PlaneGeometry(0.5, 0.5);
        
        // Combine into a single flower geometry
        this.flowers = [];
        
        // Group flowers by type for better batching
        const flowersByType = {};
        
        this.flowerPositions.forEach(pos => {
            if (!flowersByType[pos.type]) {
                flowersByType[pos.type] = [];
            }
            flowersByType[pos.type].push(pos);
        });
        
        // Create each flower type
        Object.keys(flowersByType).forEach(type => {
            const positions = flowersByType[type];
            const color = flowerColors[type] || flowerColors[0];
            
            // Create stem
            const stemMaterial = new THREE.MeshLambertMaterial({
                color: 0x3D9142, // Green stem
            });
            
            // Create flower petals
            const petalMaterial = new THREE.MeshLambertMaterial({
                color: color,
                side: THREE.DoubleSide
            });
            
            // Create each flower individually - less performant but simpler to implement
            positions.forEach(pos => {
                // Create stem
                const stem = new THREE.Mesh(stemGeometry, stemMaterial);
                stem.position.set(pos.x, pos.y, pos.z);
                this.scene.add(stem);
                this.flowers.push(stem);
                
                // Create petals (intersecting planes)
                const petal1 = new THREE.Mesh(petalGeometry, petalMaterial);
                petal1.position.set(pos.x, pos.y + 0.8, pos.z);
                petal1.rotation.y = Math.random() * Math.PI;
                this.scene.add(petal1);
                this.flowers.push(petal1);
                
                const petal2 = new THREE.Mesh(petalGeometry, petalMaterial);
                petal2.position.set(pos.x, pos.y + 0.8, pos.z);
                petal2.rotation.y = petal1.rotation.y + Math.PI / 2;
                this.scene.add(petal2);
                this.flowers.push(petal2);
            });
        });
        
        console.log(`Created ${this.flowers.length} flower parts`);
    }
    
    createMinecraftTrees() {
        // Create some Minecraft-style trees
        const treeCount = 30;
        
        // Initialize tree tracking array - this is critical for collision detection
        this.trees = [];
        
        for (let i = 0; i < treeCount; i++) {
            // Random position on the map
            let x, z, y;
            let validPosition = false;
            
            while (!validPosition) {
                // Position away from center
                const angle = Math.random() * Math.PI * 2;
                const distance = randomBetween(this.boundarySize / 5, this.boundarySize / 2.2);
                x = Math.cos(angle) * distance;
                z = Math.sin(angle) * distance;
                
                // Get height at this position
                y = this.getHeightAt(x, z);
                
                // Check if it's a valid position for a tree (not underwater, not in center)
                if (y > this.waterLevel) {
                    validPosition = true;
                    
                    // Check that it's not too close to obstacles
                    for (const obstacle of this.obstacles || []) {
                        if (!obstacle) continue;
                        const dist = this.calculateDistance(new THREE.Vector3(x, y, z), obstacle.position);
                        if (dist < (obstacle.radius || 2) + 2) {
                            validPosition = false;
                            break;
                        }
                    }
                }
            }
            
            // Create tree trunk (brown box)
            const trunkGeometry = new THREE.BoxGeometry(1, 5, 1);
            const trunkMaterial = new THREE.MeshLambertMaterial({
                color: 0x8B4513, // Brown
            });
            
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.set(x, y + 2.5, z); // Position at terrain height
            this.scene.add(trunk);
            this.trees.push(trunk);
            
            // Create tree leaves (green cubes)
            const leavesGeometry = new THREE.BoxGeometry(5, 5, 5);
            const leavesMaterial = new THREE.MeshLambertMaterial({
                color: 0x2E8B57, // Forest green
            });
            
            const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
            leaves.position.set(x, y + 6.5, z); // Position above trunk
            this.scene.add(leaves);
            this.trees.push(leaves);
            
            // Store EACH tree trunk with a larger collision radius
            this.trees.push({
                position: new THREE.Vector3(x, 0, z), // Use ground level for collision
                radius: 2.0, // Make this larger than visual trunk size
                type: 'tree'
            });
            
            // Also add this to obstacles array for unified collision checking
            this.obstacles.push({
                position: new THREE.Vector3(x, 0, z),
                radius: 2.0,
                userData: { type: 'tree' }
            });
        }
        
        console.log(`Added ${this.trees.length} trees to collision system`);
    }
    
    createBoundary() {
        // Create boundary walls to keep tanks inside
        const wallHeight = 8; // Lower walls for Minecraft style
        const wallThickness = 1;
        const wallMaterial = new THREE.MeshLambertMaterial({
            color: 0x8B4513, // Brown wooden fence
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
            color: 0x8B4513, // Brown
            linewidth: 2
        });
        const boundaryLine = new THREE.LineSegments(boundaryLineGeo, boundaryLineMat);
        boundaryLine.rotation.x = -Math.PI / 2; // Make it horizontal
        boundaryLine.position.y = 0.1; // Slightly above ground
        this.scene.add(boundaryLine);
    }
    
    createObstacles() {
        this.obstacles = [];
        
        // Create Minecraft-style obstacles (smaller boxes with texture)
        for (let i = 0; i < 10; i++) {
            const size = randomBetween(2, 4); // Smaller, block-like size
            const height = randomBetween(2, 6);
            
            // Create Minecraft-like block
            const obstacleGeometry = new THREE.BoxGeometry(size, height, size);
            
            // Choose obstacle type
            const type = Math.random();
            let obstacleMaterial;
            
            if (type < 0.3) {
                // Stone blocks
                obstacleMaterial = new THREE.MeshLambertMaterial({
                    color: 0x888888, // Gray
                });
            } else if (type < 0.6) {
                // Wood logs
                obstacleMaterial = new THREE.MeshLambertMaterial({
                    color: 0x8B4513, // Brown wood
                });
            } else {
                // Dirt mounds
                obstacleMaterial = new THREE.MeshLambertMaterial({
                    color: 0x8B6245, // Brown dirt
                });
            }
            
            const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
            
            // Position away from center
            let x, z;
            do {
                x = randomBetween(-this.boundarySize / 3, this.boundarySize / 3);
                z = randomBetween(-this.boundarySize / 3, this.boundarySize / 3);
            } while (Math.sqrt(x * x + z * z) < 15); // Not too close to center
            
            // Get height at this position and place on ground
            const y = this.getHeightAt(x, z);
            obstacle.position.set(x, y + height / 2, z);
            
            // Add to scene and obstacles array
            this.scene.add(obstacle);
            this.obstacles.push(obstacle);
            
            // Add radius for collision detection
            obstacle.radius = Math.max(size, size) / 2;
            
            // Tag this as an obstacle for AI detection
            obstacle.userData = { isObstacle: true };
        }
        
        // Add some Minecraft-style houses (2-3 small houses)
        const houseCount = Math.floor(Math.random() * 2) + 1;
        
        for (let i = 0; i < houseCount; i++) {
            this.createMinecraftHouse();
        }
    }
    
    createMinecraftHouse() {
        // Create a simple Minecraft-style house
        const width = randomBetween(8, 12);
        const depth = randomBetween(8, 12);
        const height = randomBetween(5, 8);
        
        // Position house away from center
        let x, z;
        do {
            const angle = Math.random() * Math.PI * 2;
            const distance = randomBetween(this.boundarySize / 4, this.boundarySize / 2.5);
            x = Math.cos(angle) * distance;
            z = Math.sin(angle) * distance;
        } while (Math.sqrt(x * x + z * z) < 25); // Not too close to center
        
        // Get height at this position
        const y = this.getHeightAt(x, z);
        
        // Create house base/foundation (stone)
        const foundationGeometry = new THREE.BoxGeometry(width, 1, depth);
        const foundationMaterial = new THREE.MeshLambertMaterial({
            color: 0x888888, // Stone gray
        });
        
        const foundation = new THREE.Mesh(foundationGeometry, foundationMaterial);
        foundation.position.set(x, y + 0.5, z);
        this.scene.add(foundation);
        this.obstacles.push(foundation);
        foundation.radius = Math.max(width, depth) / 2;
        
        // Create house walls (wood planks)
        const wallsGeometry = new THREE.BoxGeometry(width, height, depth);
        wallsGeometry.translate(0, height / 2, 0); // Move pivot to bottom
        
        // Make it hollow by scaling inner cube and using CSG subtraction
        const innerGeometry = new THREE.BoxGeometry(width - 2, height - 1, depth - 2);
        innerGeometry.translate(0, height / 2 + 0.5, 0);
        
        const wallsMaterial = new THREE.MeshLambertMaterial({
            color: 0xC19A6B, // Wooden planks
        });
        
        const walls = new THREE.Mesh(wallsGeometry, wallsMaterial);
        walls.position.set(x, y + 1, z);
        this.scene.add(walls);
        
        // Create roof (red)
        const roofGeometry = new THREE.BoxGeometry(width + 2, 1, depth + 2);
        const roofMaterial = new THREE.MeshLambertMaterial({
            color: 0xA52A2A, // Brown-red
        });
        
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(x, y + 1 + height, z);
        this.scene.add(roof);
        
        // Create door (brown)
        const doorGeometry = new THREE.BoxGeometry(2, 3, 0.5);
        const doorMaterial = new THREE.MeshLambertMaterial({
            color: 0x8B4513, // Brown
        });
        
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(x, y + 1 + 1.5, z + depth / 2);
        this.scene.add(door);
        
        // Create windows (light blue)
        const windowGeometry = new THREE.BoxGeometry(2, 2, 0.5);
        const windowMaterial = new THREE.MeshLambertMaterial({
            color: 0xADD8E6, // Light blue
            transparent: true,
            opacity: 0.8
        });
        
        // Add a few windows
        const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
        window1.position.set(x + width / 4, y + 1 + height / 2, z + depth / 2);
        this.scene.add(window1);
        
        const window2 = new THREE.Mesh(windowGeometry, windowMaterial);
        window2.position.set(x - width / 4, y + 1 + height / 2, z + depth / 2);
        this.scene.add(window2);
        
        // Add house components to obstacles
        this.obstacles.push(walls);
        walls.radius = Math.max(width, depth) / 2;
    }
    
    createSkybox() {
        // Create Minecraft-style skybox
        const skyboxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
        
        // Create Minecraft-like sky color (bright blue)
        const skyColor = new THREE.Color(0x84CDEE);
        
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: skyColor,
            side: THREE.BackSide
        });
        
        const skybox = new THREE.Mesh(skyboxGeometry, skyMaterial);
        this.scene.add(skybox);
        
        // Add a bright directional light like Minecraft
        const sunLight = new THREE.DirectionalLight(0xFFFFEE, 1.2);
        sunLight.position.set(50, 100, 50);
        sunLight.castShadow = true;
        this.scene.add(sunLight);
        
        // Add ambient light for Minecraft-style even lighting
        const ambientLight = new THREE.AmbientLight(0xCCCCCC, 0.8);
        this.scene.add(ambientLight);
    }
    
    // Helper method to get height at a given x,z position
    getHeightAt(x, z) {
        // Default to 0 if outside range
        if (Math.abs(x) > this.size/2 || Math.abs(z) > this.size/2) {
            return 0;
        }
        
        // Convert from world coords to terrain coords
        const terrainX = (x + this.size/2) / this.size * this.segments;
        const terrainZ = (z + this.size/2) / this.size * this.segments;
        
        // Get indices of surrounding vertices
        const x1 = Math.floor(terrainX);
        const z1 = Math.floor(terrainZ);
        const x2 = Math.min(x1 + 1, this.segments);
        const z2 = Math.min(z1 + 1, this.segments);
        
        // Weights for bilinear interpolation
        const wx = terrainX - x1;
        const wz = terrainZ - z1;
        
        // Access vertex data - complex because buffer geometries store data differently
        const vertices = this.ground.geometry.attributes.position.array;
        
        // Helper to get height at a specific vertex index
        const getHeight = (x, z) => {
            const i = (z * (this.segments + 1) + x) * 3 + 1; // +1 for y component
            return vertices[i];
        };
        
        // Interpolate heights
        const h00 = getHeight(x1, z1);
        const h10 = getHeight(x2, z1);
        const h01 = getHeight(x1, z2);
        const h11 = getHeight(x2, z2);
        
        // Bilinear interpolation
        const h0 = h00 * (1 - wx) + h10 * wx;
        const h1 = h01 * (1 - wx) + h11 * wx;
        return h0 * (1 - wz) + h1 * wz;
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
            const dist = this.calculateDistance(object.position, obstacle.position);
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
        
        return direction.normalize();
    }
    
    keepWithinBoundaries(object) {
        // Keep the object within the boundaries of the terrain
        const maxX = this.boundarySize / 2;
        const maxZ = this.boundarySize / 2;
        
        const position = object.tank ? object.tank.position : object.position;
        
        // Clamp position to boundaries
        position.x = clamp(position.x, -maxX, maxX);
        position.z = clamp(position.z, -maxZ, maxZ);
        
        // If it's on water, move it to nearest land
        const height = this.getHeightAt(position.x, position.z);
        if (height <= this.waterLevel) {
            // Find closest non-water position
            // This is a simplistic approach - in a real game you'd use pathfinding
            const directions = [
                new THREE.Vector3(1, 0, 0),
                new THREE.Vector3(-1, 0, 0),
                new THREE.Vector3(0, 0, 1),
                new THREE.Vector3(0, 0, -1)
            ];
            
            // Try each direction until we find land
            for (const dir of directions) {
                for (let dist = 2; dist < 20; dist += 2) {
                    const testPos = position.clone().add(dir.clone().multiplyScalar(dist));
                    const testHeight = this.getHeightAt(testPos.x, testPos.z);
                    
                    if (testHeight > this.waterLevel && 
                        Math.abs(testPos.x) < maxX && 
                        Math.abs(testPos.z) < maxZ) {
                        // Found land, move there
                        position.copy(testPos);
                        return;
                    }
                }
            }
        }
    }
    
    // Update obstacle collision handling method
    handleObstacleCollision(object, obstacle) {
        // Get positions
        const objPos = object.position.clone();
        const obstaclePos = obstacle.position.clone();
        
        // Calculate collision direction and distance
        const collisionDir = new THREE.Vector3()
            .subVectors(objPos, obstaclePos)
            .normalize();
        
        const distance = this.calculateDistance(objPos, obstaclePos);
        const overlap = object.radius + obstacle.radius - distance;
        
        if (overlap <= 0) {
            return false; // No collision to handle
        }
        
        // Push the object out of collision
        const pushAmount = overlap + 0.1; // Small extra distance to ensure no overlap
        
        // Update the object's position
        object.tank.position.add(collisionDir.multiplyScalar(pushAmount));
        
        return true; // Collision handled
    }
    
    // Update method to handle animations like water and flowers
    update(deltaTime) {
        // Animate water surface in a gentle wave
        if (this.water) {
            // Simple "breathing" animation for water surface
            this.water.position.y = this.waterLevel + 0.1 + Math.sin(Date.now() * 0.001) * 0.05;
        }
        
        // Animate flowers (gentle swaying)
        if (this.flowers && this.flowers.length > 0) {
            for (let i = 0; i < this.flowers.length; i++) {
                const flower = this.flowers[i];
                
                // Only animate the stem and petals, not the leaves
                if (flower.geometry.type === "BoxGeometry") {
                    // Gentle random sway for stems
                    flower.rotation.x = Math.sin((Date.now() + i * 100) * 0.002) * 0.05;
                    flower.rotation.z = Math.cos((Date.now() + i * 100) * 0.002) * 0.05;
                } else if (flower.geometry.type === "PlaneGeometry") {
                    // Gentle rotation for petals
                    flower.rotation.y += Math.sin((Date.now() + i * 100) * 0.001) * 0.01;
                }
            }
        }
    }
    
    // Add a dedicated method to check tree collisions with a larger buffer
    isPositionInsideTree(position, radius = 0) {
        if (!this.trees || this.trees.length === 0) return false;
        
        for (const tree of this.trees) {
            // Check horizontal distance only (x/z plane)
            const dx = position.x - tree.position.x;
            const dz = position.z - tree.position.z;
            const distSquared = dx * dx + dz * dz;
            
            // Use squared distance for performance
            const minDistSquared = Math.pow(tree.radius + radius, 2);
            
            if (distSquared < minDistSquared) {
                return true; // Position is inside a tree
            }
        }
        
        return false; // Position is not inside any tree
    }
}