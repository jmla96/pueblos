import { Injectable } from '@angular/core';
import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Vector3,
  Color3,
  Mesh,
  AbstractMesh,
} from '@babylonjs/core';

@Injectable({
  providedIn: 'root',
})
export class MountainService {
  private mountains: Mesh[] = [];
  private mountainRadius = 500; // Radio inicial para generar montañas
  private mountainSize = 50; // Tamaño de cada montaña
  private mountainHeight = 30; // Altura máxima de las montañas
  private terrainLoaded = false;

  constructor() {}

  initializeMountains(scene: Scene, center: Vector3): void {
    this.generateMountains(scene, center, this.mountainRadius);
  }

  private generateMountains(scene: Scene, center: Vector3, radius: number): void {
    const numMountains = 50; // Número de montañas a generar
    for (let i = 0; i < numMountains; i++) {
      const angle = Math.random() * Math.PI * 2; // Ángulo aleatorio
      const distance = Math.random() * radius + radius / 2; // Distancia aleatoria desde el centro
      const x = center.x + Math.cos(angle) * distance;
      const z = center.z + Math.sin(angle) * distance;

      const mountain = MeshBuilder.CreateCylinder(
        `mountain_${i}`,
        { diameter: this.mountainSize, height: Math.random() * this.mountainHeight + 10 },
        scene
      );
      mountain.position = new Vector3(x, 0, z);

      const material = new StandardMaterial(`mountainMaterial_${i}`, scene);
      material.diffuseColor = new Color3(0.5, 0.35, 0.2); // Color marrón para las montañas
      material.specularColor = new Color3(0, 0, 0); // Sin brillo especular
      mountain.material = material;

      this.mountains.push(mountain);
    }
  }

  checkPlayerPosition(
    scene: Scene,
    playerPosition: Vector3,
    mapLimits: { north: number; south: number; east: number; west: number },
    loadNewTerrain: (direction: string) => void
  ): void {
    if (playerPosition.z > mapLimits.north) {
      console.log('Cruzaste el límite norte. Cargando nuevas montañas y terreno...');
      this.loadNewTerrain(scene, 'north', playerPosition, loadNewTerrain);
    } else if (playerPosition.z < mapLimits.south) {
      console.log('Cruzaste el límite sur. Cargando nuevas montañas y terreno...');
      this.loadNewTerrain(scene, 'south', playerPosition, loadNewTerrain);
    } else if (playerPosition.x > mapLimits.east) {
      console.log('Cruzaste el límite este. Cargando nuevas montañas y terreno...');
      this.loadNewTerrain(scene, 'east', playerPosition, loadNewTerrain);
    } else if (playerPosition.x < mapLimits.west) {
      console.log('Cruzaste el límite oeste. Cargando nuevas montañas y terreno...');
      this.loadNewTerrain(scene, 'west', playerPosition, loadNewTerrain);
    }
  }

  private loadNewTerrain(
    scene: Scene,
    direction: string,
    playerPosition: Vector3,
    loadNewTerrain: (direction: string) => void
  ): void {
    if (this.terrainLoaded) return;
    this.terrainLoaded = true;

    // Generar nuevas montañas en la dirección del movimiento
    const offset = 1000; // Distancia para cargar el nuevo terreno
    let newCenter: Vector3;

    switch (direction) {
      case 'north':
        newCenter = new Vector3(playerPosition.x, 0, playerPosition.z + offset);
        break;
      case 'south':
        newCenter = new Vector3(playerPosition.x, 0, playerPosition.z - offset);
        break;
      case 'east':
        newCenter = new Vector3(playerPosition.x + offset, 0, playerPosition.z);
        break;
      case 'west':
        newCenter = new Vector3(playerPosition.x - offset, 0, playerPosition.z);
        break;
      default:
        return;
    }

    this.generateMountains(scene, newCenter, this.mountainRadius);

    // Simular la carga de un pueblo después de las montañas
    setTimeout(() => {
      console.log(`Cargando pueblo en dirección ${direction}...`);
      loadNewTerrain(direction); // Llamar a la función para cargar el nuevo terreno
      this.terrainLoaded = false;
    }, 3000); // Simular un retraso en la carga del pueblo
  }
}