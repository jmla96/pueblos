import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  SceneLoader,
  Mesh,
  StandardMaterial,
  Color3,
} from '@babylonjs/core';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  @ViewChild('renderCanvas', { static: true }) renderCanvas!: ElementRef<HTMLCanvasElement>;

  private engine!: Engine;
  private scene!: Scene;
  private character!: Mesh | null; 

  constructor() {}

  ngOnInit(): void {
    this.initializeScene();
    window.addEventListener("resize", () => {
      this.engine.resize();
      this.adjustCanvasSize();
    }); 
    this.adjustCanvasSize();
  }

  private async initializeScene(): Promise<void> {
    // Crear el motor y la escena
    this.engine = new Engine(this.renderCanvas.nativeElement, true);
    this.scene = new Scene(this.engine);
    
    // Configurar la cámara
    const camera = new ArcRotateCamera(
      'profileCamera',
      Math.PI / 2,
      Math.PI / 3,
      10,
      new Vector3(0, 1, 0),
      this.scene
    );
    camera.attachControl(this.renderCanvas.nativeElement, true);

    // Agregar una luz hemisférica
    const light = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), this.scene);
    light.intensity = 0.8;

    // Cargar el personaje
    await this.loadCharacter();

    // Iniciar el bucle de renderizado
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    // Manejar el redimensionamiento de la ventana
    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }
  adjustCanvasSize() {
    this.renderCanvas.nativeElement.width = window.innerWidth;
    this.renderCanvas.nativeElement.height = window.innerHeight;
    this.engine.setSize(window.innerWidth, window.innerHeight);
  }
  
  private async loadCharacter(): Promise<void> {
    const { meshes } = await SceneLoader.ImportMeshAsync(
      '',
      '../../assets/modelos3D/',
      'personaje.glb',
      this.scene
    );
    this.character = meshes[0] as Mesh;

    // Configurar el material del personaje
    const material = new StandardMaterial('characterMaterial', this.scene);
    material.diffuseColor = new Color3(1, 1, 1);
    this.character.material = material;

    // Posicionar el personaje
    this.character.position = new Vector3(0, 0, 0);
  }

  public rotateCharacter(direction: 'left' | 'right'): void {
    if (this.character) {
      const rotationStep = Math.PI / 8;
      this.character.rotation.y += direction === 'left' ? -rotationStep : rotationStep;
    }
  }

  public changeAccessory(accessory: string): void {
    console.log(`Cambiando accesorio a: ${accessory}`);
    // Aquí puedes implementar la lógica para cambiar accesorios
  }

  public saveChanges(): void {
    console.log('Guardando cambios del personaje...');
    // Implementa la lógica para guardar los cambios realizados en el personaje
  }
  
}