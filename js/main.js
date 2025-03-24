/**
 * Main entry point for the 3D Tank Game
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Show loading message
    const loadingMessage = document.createElement('div');
    loadingMessage.style.position = 'absolute';
    loadingMessage.style.top = '50%';
    loadingMessage.style.left = '50%';
    loadingMessage.style.transform = 'translate(-50%, -50%)';
    loadingMessage.style.color = 'white';
    loadingMessage.style.fontSize = '24px';
    loadingMessage.style.fontFamily = 'Arial, sans-serif';
    loadingMessage.textContent = 'Loading 3D Tank Game...';
    document.getElementById('game-container').appendChild(loadingMessage);

    // Create intro text
    const introText = document.createElement('div');
    introText.style.position = 'absolute';
    introText.style.top = '60%';
    introText.style.left = '50%';
    introText.style.transform = 'translate(-50%, -50%)';
    introText.style.color = 'white';
    introText.style.fontSize = '16px';
    introText.style.fontFamily = 'Arial, sans-serif';
    introText.style.textAlign = 'center';
    introText.style.width = '80%';
    introText.innerHTML = `
        <h2>Controls:</h2>
        <p>WASD or Arrow Keys: Move tank</p>
        <p>Mouse: Aim turret</p>
        <p>Left Mouse Button or Spacebar: Fire</p>
        <p>Q/E: Rotate turret left/right</p>
        <p>ESC: Pause game</p>
        <p>Click anywhere to start!</p>
    `;
    document.getElementById('game-container').appendChild(introText);

    // Initialize game on a short delay to ensure everything is loaded
    setTimeout(() => {
        // Remove loading message and intro when game starts
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === document.body) {
                loadingMessage.style.display = 'none';
                introText.style.display = 'none';
            } else {
                introText.style.display = 'block';
            }
        });

        // Initialize the game
        const game = new Game();
        
        // Handle browser visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Pause the game when tab is not visible
                if (game.controls.isLocked) {
                    game.controls.unlock();
                }
                game.isPaused = true;
            }
        });
    }, 1000);
}); 