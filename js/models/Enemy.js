/**
 * Enemy class that extends the Tank class
 */
class Enemy extends Tank {
    constructor(scene, difficulty = 1, game = null) {
        super(scene, false, game); // false indicates it's not a player, pass game reference
        
        // Enemy-specific properties
        this.difficulty = clamp(difficulty, 1, 5);
        this.detectionRadius = 30 + (this.difficulty * 5);
        this.firingRange = 20 + (this.difficulty * 2);
        this.fireRate = 2000 - (this.difficulty * 200); // Harder enemies fire faster
        this.turnSpeed = 0.8 + (this.difficulty * 0.1);
        this.speed = 5 + (this.difficulty * 0.5);
        this.patrolTimer = 0;
        this.patrolDirection = new THREE.Vector3(
            randomBetween(-1, 1),
            0,
            randomBetween(-1, 1)
        ).normalize();
        this.lastPatrolChange = 0;
        this.patrolChangeInterval = randomBetween(3000, 6000);
        this.state = 'patrol'; // patrol, chase, attack
        this.target = null;
        this.avoidanceRadius = 5;
        this.score = this.difficulty * 100;
        this.tempSpeedReduction = 1.0; // Default is no reduction
        
        // For obstacle detection
        this.obstacleDetectionRange = 4.0 + (this.difficulty * 0.5); // More advanced tanks can detect obstacles farther away
        this.lastObstacleCheck = 0;
        this.obstacleCheckInterval = 200; // ms between obstacle checks
        
        // Reference to the terrain
        this.terrain = null;
    }
    
    // Add the setTerrain method
    setTerrain(terrain) {
        this.terrain = terrain;
        console.log("Enemy tank terrain reference set");
    }
    
    update(deltaTime, playerTank) {
        if (this.isDestroyed) return;
        
        // Store reference to player
        this.target = playerTank;
        
        // Check for obstacles periodically (not every frame to save performance)
        const now = Date.now();
        if (now - this.lastObstacleCheck > this.obstacleCheckInterval) {
            this.checkForObstacles();
            this.lastObstacleCheck = now;
        }
        
        // State machine for enemy behavior
        switch (this.state) {
            case 'patrol':
                this.patrol(deltaTime);
                // Check if player is in detection range
                if (this.canSeePlayer(playerTank)) {
                    this.state = 'chase';
                }
                break;
                
            case 'chase':
                this.chase(deltaTime, playerTank);
                // If player gets too far, go back to patrol
                if (!this.canSeePlayer(playerTank)) {
                    this.state = 'patrol';
                }
                // If player is in firing range, attack
                else if (distance(this.position, playerTank.position) < this.firingRange) {
                    this.state = 'attack';
                }
                break;
                
            case 'attack':
                this.attack(deltaTime, playerTank);
                // If player moves out of range, chase
                if (distance(this.position, playerTank.position) > this.firingRange) {
                    this.state = 'chase';
                }
                // If player gets too far, go back to patrol
                else if (!this.canSeePlayer(playerTank)) {
                    this.state = 'patrol';
                }
                break;
        }
        
        // Call parent update to handle projectiles
        super.update(deltaTime);
    }
    
    canSeePlayer(playerTank) {
        if (playerTank.isDestroyed) return false;
        
        const distToPlayer = distance(this.position, playerTank.position);
        
        // Check if player is within detection radius
        if (distToPlayer > this.detectionRadius) return false;
        
        // Simplified line of sight check
        // In a more complex game, we'd use raycasting to check for obstacles
        
        // Get direction to player
        const dirToPlayer = new THREE.Vector3().subVectors(
            playerTank.position,
            this.position
        ).normalize();
        
        // Get enemy's forward direction
        const enemyForward = new THREE.Vector3(0, 0, 1);
        enemyForward.applyQuaternion(this.tank.quaternion);
        
        // Calculate dot product to get angle
        const dotProduct = dirToPlayer.dot(enemyForward);
        
        // If player is behind, can't see (limited field of view)
        // Dot product < 0 means angle > 90 degrees
        if (dotProduct < -0.2) return false;
        
        return true;
    }
    
    patrol(deltaTime) {
        // Change patrol direction periodically
        const now = Date.now();
        if (now - this.lastPatrolChange > this.patrolChangeInterval) {
            this.patrolDirection = new THREE.Vector3(
                randomBetween(-1, 1),
                0,
                randomBetween(-1, 1)
            ).normalize();
            this.lastPatrolChange = now;
            this.patrolChangeInterval = randomBetween(3000, 6000);
        }
        
        // Rotate towards patrol direction
        this.rotateTowards(this.patrolDirection, deltaTime);
        
        // Move forward slowly, applying speed reduction if near obstacles
        const effectiveSpeed = this.speed * 0.5 * this.tempSpeedReduction;
        this.tank.translateZ(effectiveSpeed * deltaTime);
        
        // Simple boundary check
        this.handleBoundaries();
    }
    
    chase(deltaTime, playerTank) {
        if (playerTank.isDestroyed) {
            this.state = 'patrol';
            return;
        }
        
        // Get direction to player
        const dirToPlayer = new THREE.Vector3().subVectors(
            playerTank.position,
            this.position
        ).normalize();
        
        // Rotate towards player
        this.rotateTowards(dirToPlayer, deltaTime);
        
        // Move forward, faster when chasing, but apply speed reduction if needed
        const effectiveSpeed = this.speed * 0.8 * this.tempSpeedReduction;
        this.tank.translateZ(effectiveSpeed * deltaTime);
        
        // Simple boundary check
        this.handleBoundaries();
    }
    
    attack(deltaTime, playerTank) {
        if (playerTank.isDestroyed) {
            this.state = 'patrol';
            return;
        }
        
        // Calculate optimal distance (not too close, not too far)
        const distToPlayer = distance(this.position, playerTank.position);
        const optimalDistance = this.firingRange * 0.7;
        
        // Get direction to player
        const dirToPlayer = new THREE.Vector3().subVectors(
            playerTank.position,
            this.position
        ).normalize();
        
        // Aim at player
        this.rotateTowards(dirToPlayer, deltaTime);
        
        // Move to maintain optimal distance, applying speed reduction if needed
        if (distToPlayer < optimalDistance - 2) {
            // Too close, back up
            const effectiveSpeed = this.speed * 0.5 * this.tempSpeedReduction;
            this.tank.translateZ(-effectiveSpeed * deltaTime);
        } else if (distToPlayer > optimalDistance + 2) {
            // Too far, move closer
            const effectiveSpeed = this.speed * 0.5 * this.tempSpeedReduction;
            this.tank.translateZ(effectiveSpeed * deltaTime);
        }
        
        // Try to fire if aiming at player
        // Get enemy's forward direction
        const enemyForward = new THREE.Vector3(0, 0, 1);
        enemyForward.applyQuaternion(this.cannon.getWorldQuaternion(new THREE.Quaternion()));
        
        // Calculate dot product to get how well we're aiming
        const aimDot = dirToPlayer.dot(enemyForward);
        
        // Fire if aimed well enough (dot product close to 1 means vectors are aligned)
        if (aimDot > 0.95) {
            this.fire();
        }
        
        // Simple boundary check
        this.handleBoundaries();
    }
    
    rotateTowards(direction, deltaTime) {
        // Calculate target rotation
        const targetRotation = Math.atan2(direction.x, direction.z);
        
        // Get current rotation
        const currentRotation = this.tank.rotation.y;
        
        // Calculate shortest angle to target
        let deltaRotation = targetRotation - currentRotation;
        
        // Normalize to [-PI, PI]
        while (deltaRotation > Math.PI) deltaRotation -= Math.PI * 2;
        while (deltaRotation < -Math.PI) deltaRotation += Math.PI * 2;
        
        // Rotate at most by turnSpeed
        const rotateAmount = Math.sign(deltaRotation) * Math.min(
            Math.abs(deltaRotation),
            this.turnSpeed * deltaTime
        );
        
        // Apply rotation
        this.tank.rotateY(rotateAmount);
        
        // For attack state, also rotate the turret and cannon independently for better aiming
        if (this.state === 'attack' && this.target) {
            // Calculate direction to target in local space
            const localTarget = this.target.position.clone().sub(this.position);
            localTarget.applyQuaternion(this.tank.quaternion.clone().invert());
            
            // Calculate target rotation for turret
            const turretTargetRotation = Math.atan2(localTarget.x, localTarget.z);
            
            // Get current rotation
            const currentTurretRotation = this.turret.rotation.y;
            
            // Calculate shortest angle to target
            let deltaTurretRotation = turretTargetRotation - currentTurretRotation;
            
            // Normalize to [-PI, PI]
            while (deltaTurretRotation > Math.PI) deltaTurretRotation -= Math.PI * 2;
            while (deltaTurretRotation < -Math.PI) deltaTurretRotation += Math.PI * 2;
            
            // Rotate at most by turnSpeed
            const turretRotateAmount = Math.sign(deltaTurretRotation) * Math.min(
                Math.abs(deltaTurretRotation),
                this.turnSpeed * 1.5 * deltaTime
            );
            
            // Apply rotation
            this.turret.rotateY(turretRotateAmount);
            this.cannon.rotateY(turretRotateAmount);
        }
    }
    
    handleBoundaries() {
        // Simple boundary handling - keep tank within a certain area
        const maxDistance = 50;
        const distanceFromOrigin = this.position.length(); // Distance from origin
        
        // If getting close to the boundary, start turning inward
        if (distanceFromOrigin > maxDistance * 0.8) {
            // Calculate how close we are to the boundary (1.0 = at boundary, 0.0 = at center)
            const boundaryProximity = (distanceFromOrigin - (maxDistance * 0.6)) / (maxDistance * 0.4);
            
            // Direction to center
            const dirToCenter = new THREE.Vector3().subVectors(
                new THREE.Vector3(0, 0, 0),
                this.position
            ).normalize();
            
            // Blend current patrol direction with direction to center based on proximity
            this.patrolDirection.lerp(dirToCenter, boundaryProximity);
            this.patrolDirection.normalize();
            
            // If very close to boundary, make a sharper turn
            if (boundaryProximity > 0.9) {
                this.patrolDirection.copy(dirToCenter);
                this.lastPatrolChange = Date.now();
            }
        }
    }
    
    // New method for obstacle detection and avoidance
    checkForObstacles() {
        // If we don't have a terrain reference, we can't check for obstacles
        if (!this.terrain) {
            return false;
        }
        
        // Enemy's forward direction
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.tank.quaternion);
        
        // Get enemy's left direction (perpendicular to forward)
        const left = new THREE.Vector3(-forward.z, 0, forward.x).normalize();
        
        // Check in front and at wider angles for obstacles
        // By adding more ray directions, enemies can detect obstacles better
        const rayDirections = [
            forward,
            new THREE.Vector3().copy(forward).lerp(left, 0.3).normalize(),  // Slight right
            new THREE.Vector3().copy(forward).lerp(left, -0.3).normalize(), // Slight left
            new THREE.Vector3().copy(forward).lerp(left, 0.6).normalize(),  // Medium right
            new THREE.Vector3().copy(forward).lerp(left, -0.6).normalize()  // Medium left
        ];
        
        // Use the terrain obstacles directly since we now have a terrain reference
        const obstacles = this.terrain ? this.terrain.obstacles : [];
        
        if (!obstacles || obstacles.length === 0) return false;
        
        // Increase the lookahead distance for higher difficulty tanks
        const lookaheadMultiplier = 1 + (this.difficulty * 0.15);
        
        for (const direction of rayDirections) {
            // Create a ray starting from the tank's position
            const rayOrigin = this.position.clone();
            rayOrigin.y = 1; // Adjust to the height of the tank's center
            
            // Check multiple points along the ray with increased range for better tanks
            for (let i = 1; i <= 6; i++) {
                // Check multiple points along the ray
                const checkPoint = new THREE.Vector3().copy(rayOrigin).addScaledVector(
                    direction, i * 0.8 * lookaheadMultiplier
                );
                
                // Check against all obstacles
                for (const obstacle of obstacles) {
                    // Skip non-obstacle objects or the tank itself
                    if (!obstacle.radius || obstacle === this.tank) continue;
                    
                    const distToObstacle = distance(checkPoint, obstacle.position);
                    
                    // If we're close to an obstacle, adjust direction
                    // Increased avoidance distance for smoother movement
                    const avoidanceDistance = obstacle.radius + this.radius + 1.0;
                    if (distToObstacle < avoidanceDistance) {
                        this.avoidObstacle(obstacle.position);
                        return true; // Obstacle detected
                    }
                }
            }
        }
        
        return false; // No obstacles detected
    }
    
    // Method to adjust direction when obstacle is detected
    avoidObstacle(obstaclePosition) {
        // Direction from obstacle to tank
        const awayFromObstacle = new THREE.Vector3().subVectors(
            this.position,
            obstaclePosition
        ).normalize();
        
        // Get current forward direction
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.tank.quaternion);
        
        // Get tank's current speed to adjust response
        const currentSpeed = this.speed * (this.movement && this.movement.forward ? 1 : 0.5);
        
        // Calculate dot product between forward and away direction
        // This tells us if the obstacle is more to the side (dot product near 0) 
        // or directly ahead (dot product near 1)
        const forwardDot = forward.dot(awayFromObstacle);
        
        // If obstacle is more directly ahead, make a sharper turn
        const blendFactor = forwardDot > 0 ? 0.9 : 0.7;
        
        // Blend current direction with avoidance direction
        // Higher difficulty tanks are better at avoiding obstacles
        const difficultyFactor = 0.7 + (this.difficulty * 0.06);
        this.patrolDirection.copy(forward).lerp(awayFromObstacle, blendFactor * difficultyFactor).normalize();
        
        // Add slight randomness to avoid getting stuck in symmetrical situations
        // Less randomness for higher difficulty tanks (more precise movement)
        const randomFactor = 0.3 - (this.difficulty * 0.03);
        this.patrolDirection.x += (Math.random() - 0.5) * randomFactor;
        this.patrolDirection.z += (Math.random() - 0.5) * randomFactor;
        this.patrolDirection.normalize();
        
        // Mark the direction change
        this.lastPatrolChange = Date.now();
        
        // For obstacles directly ahead, temporarily reduce speed to aid avoidance
        if (forwardDot > 0.7) {
            // Slow down temporarily
            this.tempSpeedReduction = 0.5;
            setTimeout(() => {
                this.tempSpeedReduction = 1.0;
            }, 500);
        }
    }
} 