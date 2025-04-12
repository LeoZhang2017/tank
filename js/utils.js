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

// Simplex noise implementation for natural terrain
class SimplexNoise {
    constructor(seed = Math.random()) {
        this.grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
        this.p = [];
        this.perm = [];
        this.permMod12 = [];
        
        const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
        const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
        this.F2 = F2;
        this.G2 = G2;
        
        this.init(seed);
    }
    
    init(seed) {
        const random = this.mulberry32(seed);
        for (let i = 0; i < 256; i++) {
            this.p[i] = Math.floor(random() * 256);
        }
        
        for (let i = 0; i < 512; i++) {
            this.perm[i] = this.p[i & 255];
            this.permMod12[i] = this.perm[i] % 12;
        }
    }
    
    mulberry32(a) {
        return function() {
            let t = a += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    
    dot(g, x, y) {
        return g[0] * x + g[1] * y;
    }
    
    noise(xin, yin) {
        let n0, n1, n2;
        
        const s = (xin + yin) * this.F2;
        const i = Math.floor(xin + s);
        const j = Math.floor(yin + s);
        
        const t = (i + j) * this.G2;
        const X0 = i - t;
        const Y0 = j - t;
        const x0 = xin - X0;
        const y0 = yin - Y0;
        
        let i1, j1;
        if (x0 > y0) {
            i1 = 1;
            j1 = 0;
        } else {
            i1 = 0;
            j1 = 1;
        }
        
        const x1 = x0 - i1 + this.G2;
        const y1 = y0 - j1 + this.G2;
        const x2 = x0 - 1.0 + 2.0 * this.G2;
        const y2 = y0 - 1.0 + 2.0 * this.G2;
        
        const ii = i & 255;
        const jj = j & 255;
        
        const gi0 = this.permMod12[ii + this.perm[jj]];
        const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
        const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];
        
        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 < 0) n0 = 0.0;
        else {
            t0 *= t0;
            n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
        }
        
        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 < 0) n1 = 0.0;
        else {
            t1 *= t1;
            n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
        }
        
        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 < 0) n2 = 0.0;
        else {
            t2 *= t2;
            n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
        }
        
        return 70.0 * (n0 + n1 + n2);
    }
}

// Create a mountain terrain with dramatic peaks
function createMountainTerrain(width, height, segments, options = {}) {
    const defaultOptions = {
        mountainHeight: 30,        // Maximum height of mountains
        valleyHeight: -2,          // Minimum height (valleys)
        bigNoiseScale: 0.02,       // Large features scale
        smallNoiseScale: 0.1,      // Small details scale
        seed: Math.random(),       // Random seed
        flatCenter: true,          // Keep center flat for gameplay
        centerRadius: 15,          // Radius of flat center area
        mountainPositions: [],     // Optional specific mountain positions
        peakCount: 3,              // Number of major peaks
        ridgeCount: 2,             // Number of ridges 
        mistHeight: 10,            // Height at which mist starts
        snowHeight: 20             // Height at which snow starts
    };
    
    // Merge default options with provided options
    const opts = {...defaultOptions, ...options};
    
    // Create base geometry
    const geometry = new THREE.PlaneGeometry(width, height, segments, segments);
    geometry.rotateX(-Math.PI / 2); // Rotate to be horizontal
    
    // Initialize noise generators
    const bigNoise = new SimplexNoise(opts.seed);
    const smallNoise = new SimplexNoise(opts.seed + 1000);
    const detailNoise = new SimplexNoise(opts.seed + 2000);
    
    // Create ridge paths
    const ridgePaths = [];
    for (let i = 0; i < opts.ridgeCount; i++) {
        const startX = randomBetween(-width/2, width/2);
        const startZ = randomBetween(-height/2, height/2);
        const length = randomBetween(width/2, width);
        const angle = randomBetween(0, Math.PI * 2);
        
        ridgePaths.push({
            startX: startX,
            startZ: startZ,
            angle: angle,
            length: length
        });
    }
    
    // Create mountain peaks
    const peaks = [];
    for (let i = 0; i < opts.peakCount; i++) {
        const peakX = randomBetween(-width/3, width/3);
        const peakZ = randomBetween(-height/3, height/3);
        const peakHeight = randomBetween(opts.mountainHeight * 0.7, opts.mountainHeight);
        const peakWidth = randomBetween(width/8, width/5);
        
        peaks.push({
            x: peakX,
            z: peakZ,
            height: peakHeight,
            width: peakWidth
        });
    }
    
    // Add user-defined mountain positions
    opts.mountainPositions.forEach(pos => {
        peaks.push({
            x: pos.x,
            z: pos.z,
            height: pos.height || opts.mountainHeight,
            width: pos.width || width/8
        });
    });
    
    // Modify vertices
    const vertices = geometry.attributes.position.array;
    const uvs = geometry.attributes.uv.array;
    
    // Add colors for terrain types (snow, rock, grass)
    const colors = new Float32Array(vertices.length);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 2];
        
        // Calculate distance from center for flat area
        const distFromCenter = Math.sqrt(x * x + z * z);
        
        // Start with base height from big noise (large features)
        let height = bigNoise.noise(x * opts.bigNoiseScale, z * opts.bigNoiseScale) * 10;
        
        // Add smaller details
        height += smallNoise.noise(x * opts.smallNoiseScale, z * opts.smallNoiseScale) * 5;
        
        // Add even finer details for realism
        height += detailNoise.noise(x * (opts.smallNoiseScale * 3), z * (opts.smallNoiseScale * 3)) * 1;
        
        // Add mountain peaks
        let peakInfluence = 0;
        for (const peak of peaks) {
            const distToPeak = Math.sqrt((x - peak.x) * (x - peak.x) + (z - peak.z) * (z - peak.z));
            const falloff = Math.exp(-distToPeak / peak.width);
            const peakContribution = peak.height * falloff;
            
            peakInfluence = Math.max(peakInfluence, peakContribution);
        }
        
        height += peakInfluence;
        
        // Add ridge lines
        let ridgeInfluence = 0;
        for (const ridge of ridgePaths) {
            // Calculate distance to ridge line
            const dx = x - ridge.startX;
            const dz = z - ridge.startZ;
            
            // Project point onto ridge line
            const projDist = dx * Math.cos(ridge.angle) + dz * Math.sin(ridge.angle);
            const perpDist = Math.abs(-dx * Math.sin(ridge.angle) + dz * Math.cos(ridge.angle));
            
            // Only consider points along ridge length
            if (projDist >= 0 && projDist <= ridge.length) {
                // Ridge shape
                const ridgeWidth = width / 10;
                const falloff = Math.exp(-perpDist / ridgeWidth);
                const ridgeHeight = opts.mountainHeight * 0.8;
                const ridgeShape = Math.cos(projDist / ridge.length * Math.PI) * 0.5 + 0.5; // Higher in middle
                
                ridgeInfluence = Math.max(ridgeInfluence, ridgeHeight * falloff * ridgeShape);
            }
        }
        
        height += ridgeInfluence;
        
        // Scale height to desired range
        height = opts.valleyHeight + (height + 1) / 2 * (opts.mountainHeight - opts.valleyHeight);
        
        // Keep center flat for gameplay
        if (opts.flatCenter && distFromCenter < opts.centerRadius) {
            const flattenFactor = 1 - Math.pow(1 - distFromCenter / opts.centerRadius, 2);
            height *= flattenFactor;
        }
        
        // Set vertex height
        vertices[i + 1] = height;
        
        // Set vertex color based on height
        const index = i / 3;
        const colorIndex = index * 3;
        
        if (height > opts.snowHeight) {
            // Snow
            colors[colorIndex] = 0.95; // R
            colors[colorIndex + 1] = 0.95; // G
            colors[colorIndex + 2] = 0.95; // B
        } else if (height > opts.mistHeight) {
            // Rocky mountain
            const rockR = 0.6;
            const rockG = 0.6;
            const rockB = 0.6;
            
            // Blend from rock to snow as we approach snow height
            const snowBlend = Math.max(0, Math.min(1, (height - opts.mistHeight) / (opts.snowHeight - opts.mistHeight)));
            
            colors[colorIndex] = rockR * (1 - snowBlend) + 0.95 * snowBlend; // R
            colors[colorIndex + 1] = rockG * (1 - snowBlend) + 0.95 * snowBlend; // G
            colors[colorIndex + 2] = rockB * (1 - snowBlend) + 0.95 * snowBlend; // B
        } else if (height > 5) {
            // Forest area (transition to mountains)
            const forestR = 0.15;
            const forestG = 0.4;
            const forestB = 0.2;
            
            // Blend to rocky as we go up
            const rockBlend = Math.max(0, Math.min(1, (height - 5) / (opts.mistHeight - 5)));
            
            colors[colorIndex] = forestR * (1 - rockBlend) + 0.6 * rockBlend; // R
            colors[colorIndex + 1] = forestG * (1 - rockBlend) + 0.6 * rockBlend; // G
            colors[colorIndex + 2] = forestB * (1 - rockBlend) + 0.6 * rockBlend; // B
        } else if (height > 0) {
            // Grass
            colors[colorIndex] = 0.3; // R
            colors[colorIndex + 1] = 0.6; // G
            colors[colorIndex + 2] = 0.2; // B
        } else {
            // Sandy/dirt for lowest areas
            colors[colorIndex] = 0.76; // R
            colors[colorIndex + 1] = 0.7; // G
            colors[colorIndex + 2] = 0.5; // B
        }
    }
    
    // Update normals for proper lighting
    geometry.computeVertexNormals();
    
    // Store terrain data for game logic
    geometry.userData = {
        heightData: vertices,
        segments: segments,
        width: width,
        height: height,
        mountains: peaks,
        ridges: ridgePaths,
        mistHeight: opts.mistHeight,
        snowHeight: opts.snowHeight
    };
    
    return geometry;
}

// Create Minecraft-style blocky terrain
function createMinecraftTerrain(width, height, segments, options = {}) {
    const defaultOptions = {
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
        flowers: true,            // Whether to add flowers
        trees: false              // Trees will be added separately
    };
    
    // Merge default options with provided options
    const opts = {...defaultOptions, ...options};
    
    // Create base geometry
    const geometry = new THREE.PlaneGeometry(width, height, segments, segments);
    geometry.rotateX(-Math.PI / 2); // Rotate to be horizontal
    
    // Initialize noise generators
    const terrainNoise = new SimplexNoise(opts.seed);
    const biomeNoise = new SimplexNoise(opts.seed + 1000);
    const detailNoise = new SimplexNoise(opts.seed + 2000);
    const flowersNoise = new SimplexNoise(opts.seed + 3000);
    
    // Modify vertices
    const vertices = geometry.attributes.position.array;
    
    // Add colors for terrain types (grass, dirt, stone, water)
    const colors = new Float32Array(vertices.length);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Arrays to track block positions for later use
    const blockPositions = [];
    const flowerPositions = [];
    const waterPositions = [];
    
    // Minecraft-like colors
    const grassColor = new THREE.Color(0x5BBD35); // Bright Minecraft grass green  
    const grassSideColor = new THREE.Color(0x8BAF48); // Slightly darker side of grass blocks
    const dirtColor = new THREE.Color(0x8B6245); // Brown dirt
    const stoneColor = new THREE.Color(0x7D7D7D); // Gray stone
    const sandColor = new THREE.Color(0xE6CE91); // Sand color
    const waterColor = new THREE.Color(0x3D6DF2); // Water blue
    const flowerColors = [
        new THREE.Color(0xFFFF00), // Yellow
        new THREE.Color(0xFF0000), // Red
        new THREE.Color(0xFFFFFF), // White
        new THREE.Color(0xF0C1F4)  // Light purple
    ];
    
    // Process vertices
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 2];
        
        // Calculate distance from center for flat area
        const distFromCenter = Math.sqrt(x * x + z * z);
        
        // Get base terrain height from noise
        let height = terrainNoise.noise(x * opts.noiseScale, z * opts.noiseScale) * opts.heightVariation;
        
        // Add smaller details
        height += detailNoise.noise(x * (opts.noiseScale * 2), z * (opts.noiseScale * 2)) * 1;
        
        // Get biome value from noise (0 to 1 range)
        const biome = (biomeNoise.noise(x * opts.biomeNoiseScale, z * opts.biomeNoiseScale) + 1) / 2;
        
        // Apply minecraft-like quantization to create blocks
        height = Math.round(height / opts.blockSize) * opts.blockSize;
        
        // Apply the base height
        height += opts.baseHeight;
        
        // Create occasional dips for water
        if (opts.rivers) {
            const riverNoise = terrainNoise.noise(x * 0.02, z * 0.02);
            if (riverNoise > 0.75 && height > opts.waterLevel) {
                // Create water channels
                height = Math.min(height, opts.waterLevel - 0.5 + riverNoise * 0.5);
                
                // Track water positions
                waterPositions.push({x, y: opts.waterLevel, z});
            }
        }
        
        // Keep center flat for gameplay
        if (opts.flatCenter && distFromCenter < opts.centerRadius) {
            const flattenFactor = 1 - Math.pow(1 - distFromCenter / opts.centerRadius, 2);
            height = height * flattenFactor;
            
            // Ensure the center is completely flat
            if (distFromCenter < opts.centerRadius * 0.5) {
                height = 0;
            }
        }
        
        // Set vertex height
        vertices[i + 1] = height;
        
        // Set vertex color based on height and biome
        const index = i / 3;
        const colorIndex = index * 3;
        
        // Track block positions for use by other systems
        blockPositions.push({
            x: x, 
            y: height, 
            z: z, 
            biome: biome, 
            isWater: height <= opts.waterLevel
        });
        
        // Check for flowers
        if (opts.flowers && height > opts.waterLevel && height < 2) {
            const flowerValue = flowersNoise.noise(x * 0.5, z * 0.5);
            if (flowerValue > 0.96) {
                // Add flower position (about 4% chance)
                const flowerType = Math.floor(Math.random() * flowerColors.length);
                flowerPositions.push({
                    x: x,
                    y: height + 0.5, // Position on top of block
                    z: z,
                    type: flowerType
                });
            }
        }
        
        // Set colors for different block types
        if (height <= opts.waterLevel) {
            // Water
            colors[colorIndex] = waterColor.r;
            colors[colorIndex + 1] = waterColor.g;
            colors[colorIndex + 2] = waterColor.b;
        } else if (biome < 0.1 && height < 3) {
            // Sand near water
            colors[colorIndex] = sandColor.r;
            colors[colorIndex + 1] = sandColor.g;
            colors[colorIndex + 2] = sandColor.b;
        } else {
            // Grass on top (Minecraft bright green)
            colors[colorIndex] = grassColor.r;
            colors[colorIndex + 1] = grassColor.g;
            colors[colorIndex + 2] = grassColor.b;
        }
    }
    
    // Update normals for boxy look - flat shading will be applied in material
    geometry.computeVertexNormals();
    
    // Store terrain data for game logic
    geometry.userData = {
        blockPositions: blockPositions,
        flowerPositions: flowerPositions,
        waterPositions: waterPositions,
        blockSize: opts.blockSize,
        waterLevel: opts.waterLevel,
        heightData: vertices,
        segments: segments,
        width: width,
        height: height
    };
    
    return geometry;
} 