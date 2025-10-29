import { Injectable } from '@angular/core';   
import { Color3, Scene, DirectionalLight, HemisphericLight, Mesh, MeshBuilder, ShadowGenerator, StandardMaterial, Vector3 } from '@babylonjs/core';
import { GizmoManagerService } from './gizmoManager.service'; 
import { BabylonScene } from '../game/scene-one'; // Asegúrate de que la ruta sea correcta

@Injectable({
  providedIn: 'root',
})
export class CreateObjectsService {

  private mainDirectionalLight: DirectionalLight | null = null;
  private hemiLight: HemisphericLight | null = null;
  private dayNightInterval: any = null;
  private currentTime: number = 0;

  private sunMesh: Mesh | null = null;
  private moonMesh: Mesh | null = null;

  constructor(public gizmoService: GizmoManagerService) {}

  async CreateTouchBallOnGround(scene: Scene, shadowG: any, gizmoManager: any): Promise<any> {
      let clickStartTime: number | null = null;
    
      scene.onPointerDown = (evt:any) => {
        
        if (evt.button !== 0) return;
    
        
        clickStartTime = new Date().getTime();
      };

      let gizmoM;
    
      scene.onPointerUp = (evt:any) => {
        
        if (evt.button !== 0) return;
    
        
        const clickDuration = new Date().getTime() - (clickStartTime || 0);
    
        
        if (clickDuration < 200) {
          
          const pickResult = scene.pick(scene.pointerX, scene.pointerY);
          console.log('click2', pickResult.pickedMesh);
    
          
          if (pickResult?.hit && typeof pickResult.pickedMesh?.name === "string" && pickResult.pickedMesh.name.includes("terreno")) {
            const position = pickResult.pickedPoint;
    
            
            if (position) {
                gizmoM = this.gizmoService.setupGizmoManager(position, scene, shadowG, gizmoManager); 
            }
          }
        }
    
        
        clickStartTime = null;
      };
      return gizmoM;
    }
      
    CreateGround(scene: Scene): void {  
        const ground = MeshBuilder.CreateGround("ground", { width: 1, height: 1 }, scene); 
        ground.position = new Vector3(0, 0, 0); 
        ground.checkCollisions = true; 
    }
      
    CreateLightsAndShadows(
      scene: Scene, 
      shadowGenerator: any,
      environment: Mesh | null,
      character: Mesh | null
    ): Promise<{ environment: Mesh | null; character: Mesh | null; shadowG: any; shadowGenerator: any }> {
      
      const light = new DirectionalLight("dirLight", new Vector3(-1, -2, -1), scene);
      light.position = new Vector3(0, 200, 0); 
      light.intensity = 0.4; 
      light.shadowEnabled = true; 
    
      
      shadowGenerator = new ShadowGenerator(4096, light); 
      shadowGenerator.useBlurExponentialShadowMap = true; 
      shadowGenerator.blurKernel = 64; 
      shadowGenerator.forceBackFacesOnly = true; 
      shadowGenerator.darkness = 0.3; 
      shadowGenerator.bias = 0.00005; 
      shadowGenerator.normalBias = 0.1; 
      shadowGenerator.filter = ShadowGenerator.FILTER_PCF; 
     
      
      const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
      hemiLight.intensity = 0.4; 
      hemiLight.diffuse = new Color3(0.8, 0.8, 0.8); 
      hemiLight.groundColor = new Color3(0.3, 0.3, 0.3); 
      
      this.mainDirectionalLight = light;
      this.hemiLight = hemiLight;
      
      const directionalLight2 = new DirectionalLight("dirLight2", new Vector3(2, -2, 1), scene);
      directionalLight2.position = new Vector3(20, 50, 20); 
      directionalLight2.intensity = 0.6; 
    
      
      scene.meshes.forEach((mesh: any) => {
        if (mesh instanceof Mesh) {
          mesh.receiveShadows = true; 
          if(mesh.name.startsWith("root")) shadowGenerator.addShadowCaster(mesh); 
        }
      });
    
      
      if (environment) {
        environment.receiveShadows = true; 
        shadowGenerator.addShadowCaster(environment); 
      }
    
      
      if (character) {
        character.receiveShadows = true; 
        shadowGenerator.addShadowCaster(character); 
      }
      shadowGenerator.darkness = 1.8;
      
      return Promise.resolve({ environment, character, shadowG: shadowGenerator, shadowGenerator });
    }
    createBox(scene: Scene): void {
      const box = MeshBuilder.CreateBox("skyBox", { size: 100.0 }, scene);
      box.material = new StandardMaterial("Mat", scene);
      box.checkCollisions = true;
    }  

  private updateDayNightCycle(hour: number) {
    if (!this.mainDirectionalLight || !this.hemiLight) return;

    // Normaliza la hora (0-24)
    const t = (hour % 24) / 24;

    // Intensidad: 0 en medianoche, 1 en mediodía
    const intensity = Math.max(0.1, Math.sin(Math.PI * t));
    this.mainDirectionalLight.intensity = intensity * 1.2;
    this.hemiLight.intensity = 0.2 + intensity * 0.6;

    // Color para amanecer/atardecer
    if (intensity < 0.3) {
      this.mainDirectionalLight.diffuse = new Color3(1, 0.6, 0.3); // naranja
    } else {
      this.mainDirectionalLight.diffuse = new Color3(1, 1, 1); // blanco
    }

    // Dirección de la luz (simula el sol)
    const angle = Math.PI * (t - 0.25);
    const sunDirection = new Vector3(Math.cos(angle), Math.sin(angle), 0).normalize();
    this.mainDirectionalLight.direction = sunDirection.negate();

    // Mueve el sol y la luna en el cielo siguiendo la dirección de la luz
    const radius = 120;
    if (this.sunMesh) {
      this.sunMesh.position = sunDirection.scale(radius);
      this.sunMesh.isVisible = intensity > 0.15;
    }
    if (this.moonMesh) {
      const moonDirection = sunDirection.negate();
      this.moonMesh.position = moonDirection.scale(radius);
      this.moonMesh.isVisible = intensity < 0.5;
    }

    
    const isNight = intensity < 0.3;
    
    const win = window as any;
    if (win.babylonSceneInstance) {
      win.babylonSceneInstance.setLampLightsEnabled(isNight);
    } 
}
  startDayNightCycle() {
    if (this.dayNightInterval) clearInterval(this.dayNightInterval);

    // Hora local (0-24), inicia en 0 (medianoche)
    this.currentTime = 0;

    // 7 minutos = 420 segundos, 24 horas virtuales en ese tiempo
    const totalDurationMs = 20 * 1000;
    const updatesPerSecond = 30; // Más alto = más suave
    const intervalMs = 1000 / updatesPerSecond;
    const hourStep = 24 / (totalDurationMs / intervalMs);

    this.dayNightInterval = setInterval(() => {
      this.currentTime += hourStep;
      if (this.currentTime >= 24) this.currentTime = 0;
      this.updateDayNightCycle(this.currentTime);
    }, intervalMs);
  }

  stopDayNightCycle() {
    if (this.dayNightInterval) clearInterval(this.dayNightInterval);
    this.dayNightInterval = null;
  }
  createSunAndMoon(scene: Scene) {
    // Sol
    this.sunMesh = MeshBuilder.CreateSphere("sun", { diameter: 10 }, scene);
    const sunMat = new StandardMaterial("sunMat", scene);
    sunMat.emissiveColor = new Color3(1, 0.85, 0.2); // Amarillo brillante
    this.sunMesh.material = sunMat;
    this.sunMesh.position = new Vector3(0, 100, 0);

    // Luna
    this.moonMesh = MeshBuilder.CreateSphere("moon", { diameter: 8 }, scene);
    const moonMat = new StandardMaterial("moonMat", scene);
    moonMat.emissiveColor = new Color3(0.7, 0.8, 1); // Azul/blanco tenue
    this.moonMesh.material = moonMat;
    this.moonMesh.position = new Vector3(0, -100, 0);
  }
}