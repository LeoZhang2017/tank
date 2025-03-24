# 3D Tank Game

A browser-based 3D tank game built with JavaScript and Three.js. Control your tank, destroy enemy tanks, and survive as long as possible!

## Features

- 3D tank combat with physics and collision detection
- Realistic tank models including the M1 Abrams main battle tank
- Multiple enemy AI tanks with different difficulty levels
- Dynamic terrain with obstacles
- Projectile firing with visual effects
- Health and score tracking
- Mouse and keyboard controls
- Responsive design that works on different screen sizes

## Controls

- **WASD** or **Arrow Keys**: Move your tank
- **Mouse**: Aim turret
- **Left Mouse Button** or **Spacebar**: Fire
- **Q/E**: Rotate turret left/right
- **ESC**: Pause game

## Getting Started

1. Clone this repository or download the ZIP file
2. Open `index.html` in your browser
3. Click on the game window to start playing

## Requirements

- A modern web browser with WebGL support (Chrome, Firefox, Safari, Edge)
- JavaScript enabled

## Implementation Details

The game is built using the following technologies:

- **Three.js**: For 3D rendering and scene management
- **HTML5/CSS3**: For UI elements and styling
- **JavaScript**: For game logic and interaction
- **GLTF Models**: For realistic tank representations

The project is structured into several components:

- **Tank.js**: Player and base tank implementation with 3D model loading
- **Enemy.js**: AI-controlled enemy tanks
- **Projectile.js**: Tank shell implementation
- **Terrain.js**: Game world generation
- **Game.js**: Main game loop and state management
- **utils.js**: Utility functions for collision detection, etc.

## 3D Models

The game features realistic tank models:
- Player controls an M1 Abrams main battle tank
- Enemy tanks use different models with unique appearances
- The models are loaded dynamically using Three.js GLTF loader

## Future Improvements

- Add power-ups (health, speed boost, special weapons)
- Implement different tank types with unique abilities
- Add sound effects and music
- Add more detailed terrain and environment textures
- Implement a level system with increasing difficulty
- Add mobile controls for touch devices

## License

This project is open source and available for personal and educational use.

## Credits

Created as a demonstration of 3D game development using JavaScript and Three.js.

Tank models are used for educational purposes only. 