# Tank Model Integration Instructions

To fully integrate realistic tank models like the M1 Abrams shown in the reference image, follow these steps:

## Obtaining 3D Tank Models

### Option 1: Free 3D Model Repositories
You can download free GLTF/GLB tank models from these sources:
- [Sketchfab](https://sketchfab.com/search?q=tank&type=models) - Many free and paid models
- [TurboSquid](https://www.turbosquid.com/Search/Index.cfm?keyword=tank&media_typeid=2) - Professional models (some free)
- [Free3D](https://free3d.com/3d-models/tank) - Various free models

Look for models in GLB or GLTF format, which work well with Three.js.

### Option 2: Create Your Own
If you have 3D modeling skills, you can create models using:
- Blender (free)
- Autodesk Maya
- 3DS Max

Export your models in GLTF/GLB format.

## Preparing the Models

1. Ensure the model has properly named parts:
   - The turret should be named "turret"
   - The main gun should be named "cannon"
   - If parts aren't named, you'll need to identify them by their position in the scene hierarchy

2. Scale the model appropriately:
   - Most models will need rescaling to fit the game's proportions
   - The current code scales models to 0.5, but adjust as needed

3. Ensure the model faces the correct direction:
   - The front of the tank should face along the positive Z-axis
   - Rotate the model in a 3D editor if needed before exporting

## File Placement

1. Place your model files in the `/models` directory:
   - Player tank: `/models/abrams_tank.glb`
   - Enemy tank: `/models/enemy_tank.glb`

2. If using different filenames, update the paths in `Tank.js`:
   ```javascript
   const modelUrl = isPlayer ? 'models/your_player_tank.glb' : 'models/your_enemy_tank.glb';
   ```

## Testing

1. Load the game and check if the models appear correctly
2. Verify that the turret rotates properly when using Q/E keys
3. Ensure the projectiles spawn from the cannon barrel

## Troubleshooting

If models don't appear:
- Check browser console for loading errors
- Verify file paths are correct
- Ensure model format is compatible with Three.js GLTFLoader
- Try reducing model complexity if it's too detailed

If turret doesn't rotate:
- Check part naming in the model
- The code looks for parts named "turret" and "cannon"
- You may need to modify the code to match your model's structure

## License Considerations

When using 3D models:
- Always verify the license allows for use in your project
- Give appropriate credit to model creators
- For commercial projects, ensure you have proper rights to use the models 