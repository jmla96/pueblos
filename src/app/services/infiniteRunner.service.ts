import { Injectable } from '@angular/core';
import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Mesh,
  AbstractMesh,
} from '@babylonjs/core';

@Injectable({
  providedIn: 'root',
})
export class InfiniteRunnerService {
  private blocks: Mesh[] = [];
  private blockSize = 50; // Tamaño de cada bloque
  private numBlocks = 5; // Número de bloques visibles al mismo tiempo
  private objects: AbstractMesh[] = [];
  private objectPool: Mesh[] = [];
  private objectSpawnInterval = 20; // Distancia entre objetos
  private lastSpawnZ = 0;

  private lives = 3; // Vidas iniciales del jugador
  private score = 0; // Puntuación inicial

  constructor() {}

  initializeRunner(scene: Scene, character: Mesh, camera: any): void {
    this.createInitialBlocks(scene);
    this.setupCharacter(character);
    this.setupCamera(camera, character);
    this.setupGameLoop(scene, character);
  }

  private createInitialBlocks(scene: Scene): void {
    for (let i = 0; i < this.numBlocks; i++) {
      const block = MeshBuilder.CreateGround(
        `block_${i}`,
        { width: this.blockSize, height: this.blockSize },
        scene
      );
      block.position = new Vector3(0, 0, i * this.blockSize);
      block.checkCollisions = true;

      const material = new StandardMaterial(`blockMaterial_${i}`, scene);
      material.diffuseColor = new Color3(0.2, 0.8, 0.2); // Verde
      block.material = material;

      this.blocks.push(block);
    }
  }

  private setupCharacter(character: Mesh): void {
    character.position = new Vector3(0, 1, 0); // Posición inicial
    character.checkCollisions = true;
  }

  private setupCamera(camera: any, character: Mesh): void {
    camera.setPosition(new Vector3(0, 10, -20)); // Posición fija detrás del personaje
    camera.target = character.position; // La cámara sigue al personaje
    character.rotation.y = Math.PI; // Mirar hacia adelante
    camera.fov = 0.8; // Campo de visión

    camera.minZ = 0.1; // Distancia mínima de la cámara
    camera.maxZ = 1000; // Distancia máxima de la cámara

    
    camera.lowerBetaLimit = Math.PI / 2.5; // Limitar rotación vertical
    camera.upperBetaLimit = Math.PI / 2.5;
    camera.lowerRadiusLimit = 30; // Limitar el zoom
    camera.upperRadiusLimit = 30;
    camera.attachControl(false); // Deshabilitar controles de rotación
  }

  private setupGameLoop(scene: Scene, character: Mesh): void {
    scene.onBeforeRenderObservable.add(() => {
      this.moveCharacter(character);
      this.updateBlocks(character);
      this.spawnObjects(scene);
      this.checkCollisions(character);
    });
  }

  private moveCharacter(character: Mesh): void {
    const speed = 0.5; // Velocidad del personaje
    character.moveWithCollisions(new Vector3(0, 0, speed));
  }

  private updateBlocks(character: Mesh): void {
    const firstBlock = this.blocks[0];
    if (character.position.z > firstBlock.position.z + this.blockSize) {
      // Mover el primer bloque al final
      const lastBlock = this.blocks[this.blocks.length - 1];
      firstBlock.position.z = lastBlock.position.z + this.blockSize;

      // Reordenar los bloques
      this.blocks.push(this.blocks.shift()!);
    }
  }

  private spawnObjects(scene: Scene): void {
    const spawnZ = this.lastSpawnZ + this.objectSpawnInterval;
    if (this.blocks[this.blocks.length - 1].position.z >= spawnZ) {
      const isObstacle = Math.random() < 0.5; // 50% de probabilidad de ser un obstáculo
      const object = this.getRandomObject(scene, isObstacle);
      object.position = new Vector3(
        Math.random() * this.blockSize - this.blockSize / 2, // Posición aleatoria en X
        1,
        spawnZ
      );
      this.objects.push(object);
      this.lastSpawnZ = spawnZ;
    }
  }

  private getRandomObject(scene: Scene, isObstacle: boolean): Mesh {
    if (this.objectPool.length > 0) {
      return this.objectPool.pop()!;
    }

    // Crear un nuevo objeto si no hay en el pool
    const object = MeshBuilder.CreateBox('object', { size: 2 }, scene);
    const material = new StandardMaterial('objectMaterial', scene);

    if (isObstacle) {
      material.diffuseColor = new Color3(1, 0, 0); // Rojo para obstáculos peligrosos
      object.metadata = { type: 'obstacle' };
    } else {
      material.diffuseColor = new Color3(0, 1, 0); // Verde para objetos que suman puntos
      object.metadata = { type: 'collectible' };
    }

    object.material = material;
    return object;
  }

  private checkCollisions(character: Mesh): void {
    this.objects = this.objects.filter((object) => {
      if (character.intersectsMesh(object, false)) {
        if (object.metadata?.type === 'obstacle') {
          this.lives--;
          console.log(`¡Colisión con obstáculo! Vidas restantes: ${this.lives}`);
          if (this.lives <= 0) {
            console.log('¡Juego terminado!');
            // Aquí puedes implementar lógica para reiniciar el juego o mostrar un mensaje de fin
          }
        } else if (object.metadata?.type === 'collectible') {
          this.score += 10;
          console.log(`¡Objeto recolectado! Puntuación: ${this.score}`);
        }

        this.objectPool.push(object as Mesh); // Devolver al pool
        object.dispose();
        return false;
      }
      return true;
    });
  }
}