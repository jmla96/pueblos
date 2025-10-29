import {
  Scene,
  Engine,
  SceneLoader,
  Vector3,
  ArcRotateCamera,
  Mesh, 
  MeshBuilder,
  AnimationGroup,
  TransformNode,  
  CubeTexture,
  StandardMaterial,
  Texture,
  GizmoManager,
  AbstractMesh,
  Color3,
  FreeCamera, 
  CannonJSPlugin,
  WebXRDefaultExperience, 
  WebXRState,
  PointLight,
  ShadowGenerator, 
  Ray,
  Quaternion,
} from "@babylonjs/core";

import { AdvancedDynamicTexture, TextBlock, Control } from "@babylonjs/gui";

import "@babylonjs/loaders"; 
import { JsonService } from '../services/json.service';
import { FirestoreService } from "../services/firebase.service";
import { SessionService } from "../services/session.service";
import { AngularFirestore } from "@angular/fire/compat/firestore";
import { GizmoManagerService } from "../services/gizmoManager.service";
import { CreateObjectsService } from "../services/createObject.service";
import { AnimationsService } from "../services/animations.service";
import { ObstructionService } from "../services/obstruction.service";
import { HomePage } from "../home/home.page";  
import * as CANNON from 'cannon';
import { AuthService } from "../services/auth.service";
import { InfiniteRunnerService } from "../services/infiniteRunner.service";
import { MountainService } from "../services/montains.service";

(window as any).CANNON = CANNON;  
 

export class BabylonScene {
  scene: Scene;
  engine: Engine;
  character: Mesh | null = null;
  
  done: boolean = false;
  public characters: any = {};
  private loadedModels: Map<string, Mesh> = new Map(); 
  public going: boolean = false;

  public modeConstructor: boolean = false;
  public selectedMesh: Mesh | null = null;

  private xrHelper: WebXRDefaultExperience | undefined;
  public characterId: any;
  
  private gravity = -9.81;
  private isGrounded: boolean = true;
  public jumpCount: number = 0;
  public verticalVelocity = 0; 

  fincaData: any[] = [];
  arquitecture: any;
  camera:any = null;
  INITIALPOSITION = -500; 


  private grassPatches: Map<string, Mesh[]> = new Map();
  
  private grassFieldSize = 200; // Campos de pasto más amplios (200 unidades) 
  private grassLoadThreshold = 0.7; // Cargar siguiente campo al 70% del recorrido
  private currentGrassField: number = 0; // Campo actual del jugador
  private loadedGrassFields: Set<number> = new Set(); // Campos ya cargados
  private lastGrassUpdate = 0; // Timestamp para throttling del pasto
  private grassUpdateInterval = 1000; // Actualizar campos cada 1000ms (menos frecuente)
  
  // Sistema de profiling para identificar cuellos de botella durante movimiento
  private performanceProfiler = {
    movementCalc: 0,
    animationUpdate: 0,
    cameraUpdate: 0,
    collisionCheck: 0,
    rotationCalc: 0,
    lastProfile: 0,
    enabled: true
  };
  
  // Cache para optimizar rotación del personaje
  private lastRotationUpdate = 0;
  private rotationUpdateInterval = 50; // Actualizar rotación cada 50ms en lugar de cada frame
  
  private lastOptimizationCheck = 0; // Timestamp para throttling de optimizaciones
  private lastObstructionCheck = 0; // Timestamp para throttling de obstruction check
  private obstructionCheckInterval = 100; // Verificar obstrucciones cada 100ms
  private lastCameraLimitsUpdate = 0; // Timestamp para throttling de límites de cámara
  private cameraLimitsUpdateInterval = 200; // Actualizar límites de cámara cada 200ms
  private cachedCameraDirections = {
    forward: Vector3.Zero(),
    right: Vector3.Zero(),
    lastUpdate: 0,
    updateInterval: 50 // Actualizar direcciones de cámara cada 50ms
  };

  private lastExecutionTime = 0; // Timestamp de la última ejecución
  private fireInterval = 100; // Intervalo reducido para mejor respuesta (10 veces por segundo) 
  private joystickUpdateInterval = 16; // ~60 FPS para el joystick (16ms)
  
  public animationGroups: AnimationGroup[] = []; 
  private accessories: { [key: string]: Mesh } = {}; 
  private accessoryParent!: TransformNode; 
  private gizmoManager: GizmoManager | null = null;
  private jsonData: any;
  private environment: Mesh | null = null; 
  public houseModels!: (AbstractMesh | null)[];
  private shadowG!:any;
  lastobstructingMesh: AbstractMesh | null = null;  
  private parentMesh!: TransformNode;
  public shadowGenerator: any; 
  private activeAction: 'move' | 'rotate' | null = null;
  
  public isButtonPressed = false;

  public flyMode: boolean = false; 

  private mapLimits = { north: 5000, south: -5000, east: 100, west: -100 }; // Terreno angosto: solo ±100 en X, ±5000 en Z
  private isLoadingScene: boolean = false;

  private afkTimeout: any = null; // Temporizador de inactividad
  private afkTimeLimit: number = 300000;
  
  public lampPointLights: PointLight[] = [];
  private isMobileDevice: boolean = false;
  private mobileOptimizationLevel: 'low' | 'medium' | 'high' = 'medium';
  private autoOptimizationEnabled: boolean = false; 
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private averageFPS: number = 60;

  // GUI para mostrar FPS
  private guiTexture!: AdvancedDynamicTexture;
  private fpsText!: TextBlock;
  private showFPS: boolean = true;

  // Sistema de Frustum Culling
  private frustumCullingEnabled: boolean = true; // Rehabilitado con mejoras
  private frustumCullingObjects: AbstractMesh[] = [];
  private frustumBatchIndex: number = 0; // Índice para procesamiento por lotes
  private lastCameraPosition: Vector3 = Vector3.Zero();
  private lastCameraRotation: Vector3 = Vector3.Zero();
  private frustumUpdateThreshold: number = 0.5; // Actualizar si la cámara se mueve más de 0.5 unidades
  private frustumUpdateInterval: number = 100; // Actualizar cada 100ms
  private lastFrustumUpdate: number = 0;

  // Sistema de LOD (Level of Detail)
  private lodObjects: { mesh: AbstractMesh, isLOD: boolean }[] = [];
  private lodLights: PointLight[] = [];
  private lodUpdateInterval: number = 500; // ms
  private lastLODUpdate: number = 0;
  private lodHighDistance: number = 5; // Distancia para mostrar LODs
  private lodLowDistance: number = 10; // Distancia para ocultar todo
  
  // Escalado del collider y ayudas de movimiento
  private stepHeight: number = 0.9; // altura máxima para "subir escalones" suavemente
  private lastFrameCharacterPos: Vector3 | null = null; // para detectar bloqueo contra bordes
  
  // Modo planeta (mundo esférico)
  private planetMode: boolean = false;
  private planetRadius: number = 200;
  private planetMesh: Mesh | null = null;
  private characterModelRoot: TransformNode | null = null;
  constructor(
    private canvas: HTMLCanvasElement, 
    private jsonService: JsonService, 
    private firebaseService: FirestoreService,
    public sessionService: SessionService,
    private firestore: AngularFirestore,
    public gizmoManagerService: GizmoManagerService,
    public createObjectsServ: CreateObjectsService,
    public animationsServ:AnimationsService,
    public obstructionServ: ObstructionService,
    public info: any,
    public home: HomePage,
    public authServ: AuthService,
    public infiniteRunnerService: InfiniteRunnerService,
    private mountainService: MountainService) {

    this.home.isLoading = true;
    
    // Detectar si es un dispositivo móvil
    this.detectMobileDevice();
    
    // Configurar el engine para alta resolución en todos los dispositivos
    const devicePixelRatio = window.devicePixelRatio || 1;
    this.canvas.style.touchAction = "none";
    
    // Engine con configuración optimizada para alta resolución
    this.engine = new Engine(this.canvas, true, {
      preserveDrawingBuffer: true,
      stencil: false, // Desactivar stencil para mejor rendimiento
      antialias: true, // Habilitar antialiasing en todos los dispositivos
      powerPreference: "high-performance",
      alpha: false,
      adaptToDeviceRatio: true, // Adaptarse automáticamente al DPI
      audioEngine: false // Desactivar si no se usa audio
    });

    // Configurar resolución nativa completa
    this.engine.setHardwareScalingLevel(1 / devicePixelRatio);
    
    // Configuraciones adicionales para alta calidad
    this.engine.enableOfflineSupport = false;
    this.engine.disablePerformanceMonitorInBackground = true;
    
    this.scene = this.CreateScene();
    
    // Configurar métodos de debug globales
    (window as any).enableProfiling = () => this.enablePerformanceProfiling();
    (window as any).disableProfiling = () => this.disablePerformanceProfiling();
    (window as any).getPerformanceReport = () => this.getPerformanceReport();
    (window as any).resetCharacter = () => this.resetCharacterPosition();
    (window as any).checkCollisions = () => this.debugCollisionSettings(); 
    // Controles para modo planeta
    (window as any).enablePlanet = (r?: number) => { if (r) this.planetRadius = r; this.enablePlanetMode(true); };
    (window as any).disablePlanet = () => this.enablePlanetMode(false);

    // Manejo robusto de pantalla de carga
    (async () => {
      try {
        await this.initializeScene();
      } catch (e) {
        console.error('Error al inicializar la escena:', e);
      } finally {
        this.home.isLoading = false;
        if (this.home.cdr && typeof this.home.cdr.detectChanges === 'function') {
          this.home.cdr.detectChanges();
        }
      }
    })();

    window.addEventListener("resize", () => {
      this.engine.resize();
      this.adjustCanvasSize();
    });
    window.addEventListener("beforeunload", () => {
      this.removeCharacterFromFirebase();
    });
    this.adjustCanvasSize();
    (window as any).babylonSceneInstance = this;
  }
  async initializeScene(): Promise<void> {    
    await this.enablePhysics();
    await this.CreateInfiniteGround();
    await this.CreateSkybox();

    // Sistema de campos amplios de pasto con carga predictiva
    if (!this.isMobileDevice) {
      // Cargar campo inicial (campo 0) para escritorio
      this.loadGrassField(this.scene, 0);
      this.loadGrassField(this.scene, 1); // Cargar también el siguiente
    } else {
      // En móviles, cargar solo si el nivel de optimización lo permite
      if (this.mobileOptimizationLevel !== 'high') {
        this.loadGrassField(this.scene, 0);
      }
    } 
    const { environment: environ, character: charact, shadowG: shaG, shadowGenerator: shaGen } = 
    await this.createObjectsServ.CreateLightsAndShadows(this.scene, this.shadowGenerator, this.environment, this.character);
    this.createObjectsServ.startDayNightCycle();

    this.environment = environ;
    this.character = charact;
    this.shadowG = shaG;
    this.shadowGenerator = shaGen;
    if (this.shadowGenerator) {
      
        this.shadowGenerator.darkness = 0.1; // Ajusta el valor entre 0 y 1 para hacer la sombra más oscura
    } else {
        console.warn("ShadowGenerator no está inicializado.");
    }
    await this.LoadCharacter();   
    await this.loadJson();       
    
    // Inicializar GUI de FPS
    this.initializeFPSDisplay();
    
    await this.CreateClouds(this.isMobileDevice ? 20 : 50); 
    this.gizmoManager = await this.createObjectsServ.CreateTouchBallOnGround(this.scene, this.shadowG, this.gizmoManager);  
    this.LoadCharactersOnline();
    await this.enableOcclusionCulling();   
    let clickStartTime: number | null = null; 

    this.optimizeMeshesByDistance();
    //this.minimapService.createMinimapCamera(this.scene, this.character);

    this.scene.onPointerDown = (evt: any) => {
      if (evt.button !== 0) return; 
      clickStartTime = new Date().getTime();
    };
    
    
    if (!this.scene.activeCamera) {
      console.error("No camera defined in the scene.");
      return;
    }

    // Inicializar sistema de Frustum Culling
    this.initializeFrustumCulling();

    this.runRenderLoop();
    
    this.scene.onPointerDown = (evt: any) => {
      if (evt.button !== 0) return;
      clickStartTime = new Date().getTime();
    };
    
    this.scene.onPointerUp = (evt: any) => {
      if (evt.button !== 0) return; 
      const clickDuration = new Date().getTime() - (clickStartTime || 0);
  
      if (clickDuration < 200) {
          const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
  
          if (pickResult?.hit && pickResult.pickedMesh) {  
              if (pickResult.pickedMesh.name === "skyBox") {
                  if (this.selectedMesh) {
                      this.obstructionServ.fadeInMeshGroup(this.selectedMesh, this.scene); 
                      this.selectedMesh = null; 
                  } 
                  return;
              }
              
              if (this.selectedMesh) {
                  this.obstructionServ.fadeInMeshGroup(this.selectedMesh, this.scene); 
              }
              this.selectedMesh = pickResult.pickedMesh as Mesh;
              this.obstructionServ.fadeOutMeshGroup(this.selectedMesh, this.scene); 
              console.log("Objeto seleccionado:", this.selectedMesh.name);
          }
      }
  
      clickStartTime = null;
  };
    
    window.addEventListener('mousedown', (evt) => {
      if (evt.button === 0) {
          this.isButtonPressed = true; 
      }
    });

    window.addEventListener('mouseup', (evt) => {
        if (evt.button === 0) {
            this.isButtonPressed = false;
        }
    });

    this.initializeAfkDetection();
  } 

  // ===================== PLANET MODE =====================
  public async createPlanet(radius: number = 200, color: Color3 = new Color3(0.15, 0.5, 0.2)) {
    // Crea una esfera grande como planeta sin colisiones (usaremos gravedad radial)
    this.planetRadius = radius;
    if (this.planetMesh) {
      this.planetMesh.dispose();
    }
    const sphere = MeshBuilder.CreateSphere("planet", { diameter: radius * 2, segments: 32 }, this.scene);
    const mat = new StandardMaterial("planetMat", this.scene);
    mat.diffuseColor = color;
    mat.specularColor = new Color3(0.05, 0.05, 0.05);
    mat.emissiveColor = new Color3(0.02, 0.07, 0.02);
    sphere.material = mat;
    sphere.checkCollisions = false; // no colisiones, usamos proyección radial
    this.planetMesh = sphere;
  }

  public enablePlanetMode(enable: boolean) {
    this.planetMode = enable;
    if (enable) {
      // Ocultar terreno plano si existe
      const vg = this.scene.getMeshByName("visibleGround");
      const cg = this.scene.getMeshByName("collisionGround");
      if (vg) vg.setEnabled(false);
      if (cg) cg.setEnabled(false);
      // Crear planeta si no existe
      if (!this.planetMesh) {
        this.createPlanet(this.planetRadius);
      }
      // Posicionar al personaje sobre la superficie del planeta
      if (this.character) {
        const up = new Vector3(0, 1, 0);
        const radial = this.character.position.normalize();
        if (radial.lengthSquared() < 0.0001) {
          // Si estaba en (0,0,0), póngalo en el ecuador
          this.character.position = new Vector3(this.planetRadius + 1.3, 0, 0);
        } else {
          this.character.position = radial.scale(this.planetRadius + 1.3);
        }
      }
    } else {
      // Restaurar terreno plano
      const vg = this.scene.getMeshByName("visibleGround");
      const cg = this.scene.getMeshByName("collisionGround");
      if (vg) vg.setEnabled(true);
      if (cg) cg.setEnabled(true);
    }
  }

  private alignCharacterToPlanet(): void {
    if (!this.planetMode || !this.character) return;
    const pos = this.character.position;
    if (pos.lengthSquared() < 0.0001) return;
    const center = Vector3.Zero();
    const radial = pos.subtract(center).normalize(); // normal de la superficie
    // Proyectar el personaje a la superficie
    this.character.position = radial.scale(this.planetRadius + 1.3);
    // Ajustar rotación del personaje para que "arriba" sea normal radial
    const up = radial;
    const forward = this.scene.activeCamera?.getDirection(new Vector3(0, 0, 1)) || new Vector3(0, 0, 1);
    // Construir un sistema de ejes: right = up x forward, forward' = right x up
    const right = Vector3.Cross(up, forward).normalize();
    const newForward = Vector3.Cross(right, up).normalize();
    const m00 = right.x, m01 = right.y, m02 = right.z;
    const m10 = up.x,    m11 = up.y,    m12 = up.z;
    const m20 = newForward.x, m21 = newForward.y, m22 = newForward.z;
    // Convertir matriz a cuaternión
    const tr = m00 + m11 + m22;
    let qx = 0, qy = 0, qz = 0, qw = 1;
    if (tr > 0) {
      const S = Math.sqrt(tr + 1.0) * 2; // S=4*qw
      qw = 0.25 * S;
      qx = (m21 - m12) / S;
      qy = (m02 - m20) / S;
      qz = (m10 - m01) / S;
    } else if ((m00 > m11) && (m00 > m22)) {
      const S = Math.sqrt(1.0 + m00 - m11 - m22) * 2;
      qw = (m21 - m12) / S;
      qx = 0.25 * S;
      qy = (m01 + m10) / S;
      qz = (m02 + m20) / S;
    } else if (m11 > m22) {
      const S = Math.sqrt(1.0 + m11 - m00 - m22) * 2;
      qw = (m02 - m20) / S;
      qx = (m01 + m10) / S;
      qy = 0.25 * S;
      qz = (m12 + m21) / S;
    } else {
      const S = Math.sqrt(1.0 + m22 - m00 - m11) * 2;
      qw = (m10 - m01) / S;
      qx = (m02 + m20) / S;
      qy = (m12 + m21) / S;
      qz = 0.25 * S;
    }
    this.character.rotationQuaternion = new Quaternion(qx, qy, qz, qw);
  }

  private detectMobileDevice(): void {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    
    // Detectar dispositivos móviles usando user agent
    this.isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase()) ||
                         /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||
                         window.innerWidth <= 768; // También considerar pantallas pequeñas
    
    console.log('Dispositivo móvil detectado:', this.isMobileDevice);
    
    // Determinar nivel de optimización basado en el dispositivo
    this.determineMobileOptimizationLevel();
    
    // Ajustar configuraciones específicas para dispositivos móviles
    if (this.isMobileDevice) {
      this.fireInterval = 200; // Intervalo mayor para conservar batería
      this.joystickUpdateInterval = 33; // 30 FPS para joystick en móviles
    } else {
      this.fireInterval = 100; // Intervalo más rápido en desktop
      this.joystickUpdateInterval = 16; // 60 FPS en desktop
    }
  }

  private determineMobileOptimizationLevel(): void {
    if (!this.isMobileDevice) return;
    
    // Detectar la potencia del dispositivo
    const memoryInfo = (navigator as any).deviceMemory;
    const hardwareConcurrency = navigator.hardwareConcurrency || 2;
    
    if (memoryInfo) {
      if (memoryInfo <= 2 || hardwareConcurrency <= 2) {
        this.mobileOptimizationLevel = 'high'; // Dispositivos de gama baja
      } else if (memoryInfo <= 4 || hardwareConcurrency <= 4) {
        this.mobileOptimizationLevel = 'medium'; // Dispositivos de gama media
      } else {
        this.mobileOptimizationLevel = 'low'; // Dispositivos de gama alta
      }
    } else {
      // Fallback basado en user agent
      const lowEndDevices = /android.*(sm-g|sm-j|sm-a|redmi|poco)/i;
      if (lowEndDevices.test(navigator.userAgent)) {
        this.mobileOptimizationLevel = 'high';
      }
    }
    
    console.log('Nivel de optimización móvil:', this.mobileOptimizationLevel);
  }

  private getMaxLights(): number {
    if (!this.isMobileDevice) return 50; // Sin límite en desktop
    
    switch (this.mobileOptimizationLevel) {
      case 'high': return 2;    // Máximo 2 luces en dispositivos de gama baja
      case 'medium': return 5;  // Máximo 5 luces en dispositivos de gama media
      case 'low': return 10;    // Máximo 10 luces en dispositivos de gama alta
      default: return 5;
    }
  }

  enableScaling(): void {
    if (this.gizmoManager) {
      this.gizmoManager.positionGizmoEnabled = false;
      this.gizmoManager.rotationGizmoEnabled = false;
      this.gizmoManager.scaleGizmoEnabled = true;
    }
  }

  enablePosition(): void {
    if (this.gizmoManager) {
      this.gizmoManager.positionGizmoEnabled = true;
      this.gizmoManager.rotationGizmoEnabled = false;
      this.gizmoManager.scaleGizmoEnabled = false;
    }
  }
  
  CreateScene(): Scene {

    const scene = new Scene(this.engine); 

    scene.onPointerDown = (evt) => {
      if (evt.button === 0) this.engine.enterPointerlock();
      if (evt.button === 1) this.engine.exitPointerlock();
    };
    
    scene.collisionsEnabled = true;
    
    return scene;
  }
 
  async LoadCharacter(): Promise<void> {
    const { meshes, animationGroups } = await SceneLoader.ImportMeshAsync(
        "",
        "../../assets/modelos3D/",
        "personaje.glb",
        this.scene
    );
    const mainMesh = meshes.find((mesh: any) => mesh instanceof Mesh) as Mesh | undefined;

    if (mainMesh) {
        this.enableOutline(mainMesh);
        this.loadedModels.set("personaje", mainMesh);
        this.character = mainMesh;

        // Configurar posición inicial
        const collisionGroundY = this.INITIALPOSITION;
        const visibleGroundOffset = 1.3;
        this.character.position = new Vector3(0, collisionGroundY + visibleGroundOffset, 0);

  this.character.rotation = new Vector3(0, Math.PI / 2, 0);
  // Configurar collider tipo elipsoide para mejores colisiones al caminar/escalar
  this.character.checkCollisions = true;
  this.character.ellipsoid = new Vector3(0.6, 1.0, 0.6); // ancho, alto/2, profundidad
  this.character.ellipsoidOffset = new Vector3(0, 1.0, 0); // levantar el centro del collider

        // Configurar sombras y luz
        this.character.receiveShadows = true; // Habilitar recepción de sombras

        // Validar si `this.shadowGenerator` está inicializado
        if (this.shadowGenerator) {
            this.shadowGenerator.addShadowCaster(this.character); // Agregar como emisor de sombras
        } else {
            console.warn("ShadowGenerator no está inicializado. No se puede agregar el personaje como emisor de sombras.");
        }

        // Configurar material del personaje
        const characterMaterial = new StandardMaterial("characterMaterial", this.scene);
        characterMaterial.diffuseColor = new Color3(1, 1, 1); // Color blanco
        characterMaterial.specularColor = new Color3(0.5, 0.5, 0.5); // Brillo especular
        characterMaterial.ambientColor = new Color3(0.2, 0.2, 0.2); // Luz ambiental
        this.character.material = characterMaterial;

  this.animationGroups = animationGroups;

  this.CreateThirdPersonCamera();
  this.EnableCharacterMovement();

        this.animationsServ.playAnimation("Still", true, animationGroups);
    } else {
        console.warn("No se encontró un mesh de tipo 'Mesh' en el archivo 'personaje.glb'.");
    }
}
  
async LoadCharactersOnline(): Promise<void> {
  this.firebaseService.getItems("characters", this.info.id, 'place').subscribe((users: any[]) => {
      const newUserIds = new Set(users.map((userData: any) => userData.payload.doc.data().id));

      // Eliminar jugadores que ya no están en la lista
      for (const userId in this.characters) {
          if (!newUserIds.has(userId)) {
              this.characters[userId].mesh.dispose();
              delete this.characters[userId];
          }
      }

      users.forEach(async (userData: any) => {
          const user = userData.payload.doc.data();

          if (this.characterId !== user.id) {
              const positionArray = user.position.replace(/'/g, "").split(", ");
              const rotationArray = user.rotation.replace(/'/g, "").split(", ");

              const targetPosition = new Vector3(
                  parseFloat(positionArray[0]),
                  parseFloat(positionArray[1]),
                  parseFloat(positionArray[2])
              );

              const targetRotation = new Vector3(
                  parseFloat(rotationArray[0]),
                  parseFloat(rotationArray[1]),
                  parseFloat(rotationArray[2])
              );

              if (this.characters[user.id]?.mesh) {
                  // Interpolación suave para la posición
                  this.interpolatePosition(this.characters[user.id].mesh, targetPosition);

                  // Actualizar la rotación directamente
                  this.characters[user.id].mesh.rotation = targetRotation;
              } else {
                  // Crear un nuevo jugador si no existe
                  const mainMesh = this.loadedModels.get("personaje")!.clone();
                  this.enableOutline(mainMesh);
                  this.characters[user.id] = { ...user, mesh: mainMesh };
                  this.characters[user.id].mesh.position = targetPosition;
                  this.characters[user.id].mesh.rotation = targetRotation;

                  // Configurar sombras y colisiones
                  this.characters[user.id].mesh.receiveShadows = true; 
                  this.shadowGenerator.addShadowCaster(this.characters[user.id].mesh);
              }
          }
      });
  });
}
private interpolatePosition(mesh: Mesh, targetPosition: Vector3): void {
    const duration = 500; // Duración de la interpolación en milisegundos
    const startPosition = mesh.position.clone();
    const startTime = performance.now();

    const updatePosition = () => {
        const currentTime = performance.now();
        const elapsedTime = currentTime - startTime;
        const t = Math.min(elapsedTime / duration, 1); // Progreso de la interpolación (0 a 1)

        // Interpolar hacia la posición objetivo
        mesh.position = Vector3.Lerp(startPosition, targetPosition, t);

        // Continuar interpolando hasta que alcance la posición objetivo
        if (t < 1) {
            requestAnimationFrame(updatePosition);
        } else {
            // Asegurar que la posición final sea exacta
            mesh.position = targetPosition.clone();
        }
    };

    updatePosition();
}
  moveToPosition(mesh: Mesh, targetPosition: Vector3, speed: number): void {
    const animationLoop = () => {
        const currentPosition = mesh.position;
        const direction = targetPosition.subtract(currentPosition).normalize();
        const distance = Vector3.Distance(currentPosition, targetPosition);
        const moveStep = direction.scale(Math.min(speed, distance));

        mesh.position = currentPosition.add(moveStep);

        if (distance > 0.1) {
            requestAnimationFrame(animationLoop);
        } else {
            mesh.position = targetPosition.clone();
        }
    }; 
    animationLoop();
  }

  EnableCharacterMovement(): void {
    if (!this.character) return;

  let speed = 2; // Velocidad aumentada para mejor jugabilidad
  const gravity = -1; 
  const flyForce = 1.4;  
    const inputMap: { [key: string]: boolean } = {}; 
    let currentAnimation: string | null = null;

    const playAnimationIfNotPlaying = (animation: string, speedRatio: number = 1) => {
        if (currentAnimation !== animation) {
            const animationGroup = this.animationGroups.find((group) => group.name === animation);
            if (animationGroup) {
                animationGroup.speedRatio = speedRatio;  
                this.animationsServ.playAnimation(animation, true, this.animationGroups);
                currentAnimation = animation;
            }
        } else { 
            const animationGroup = this.animationGroups.find((group) => group.name === animation);
            if (animationGroup) {
                animationGroup.speedRatio = speedRatio;
            }
        }
    };
    
  window.addEventListener('keydown', (evt) => {
    inputMap[evt.key] = true;
    // Saltar con barra espaciadora si está en el suelo y no en modo vuelo
        if (evt.key === ' ' && this.isGrounded && !this.flyMode) {
          this.verticalVelocity = 0.8; // impulso de salto (1/10)
      this.isGrounded = false;
      playAnimationIfNotPlaying("Jumping", 1.0);
    }
  });

    window.addEventListener('keyup', (evt) => {
        inputMap[evt.key] = false;
    });
    
    this.scene.onBeforeRenderObservable.add(() => {
        if (!this.character || !this.scene.activeCamera ) return; 
        
        const currentTime = performance.now(); // Mover al principio para evitar errores de scope 
      
        this.checkMapBoundaries();
        let movementVector = Vector3.Zero();
        if (inputMap['f']) {
            this.flyMode = !this.flyMode;
            // resetear estado vertical al cambiar de modo
            if (this.flyMode) {
              this.verticalVelocity = 0;
              this.isGrounded = false;
            }
        }
        if (inputMap['s'] || inputMap['ArrowUp']) {
            movementVector = movementVector.add(new Vector3(0, 0, -1));
        }
        if (inputMap['w'] || inputMap['ArrowDown']) {
            movementVector = movementVector.add(new Vector3(0, 0, 1));
        }
        if (inputMap['a'] || inputMap['ArrowLeft']) {
            movementVector = movementVector.add(new Vector3(-1, 0, 0));
        }
        if (inputMap['d'] || inputMap['ArrowRight']) {
            movementVector = movementVector.add(new Vector3(1, 0, 0));
        }
        if (inputMap['x']) {
          this.sessionService.clear();
        }
        
        if (this.joystickInput.angle !== null && this.joystickInput.distance !== null) { 
          
          if(!this.flyMode){ 
            if(!this.isGrounded){ 
              speed = speed; 
            }
            else if (this.joystickInput.distance >= 50) { 
              speed = 1.3; 
              this.character.position.y += 0.3; 
              if (this.isGrounded) {
                this.verticalVelocity = 0.75; // 1/10 del salto previo
                this.isGrounded = false;
                playAnimationIfNotPlaying("Jumping", 1.0);
              }
            } else if (this.joystickInput.distance >= 15) {  
              speed = 0.8;  
              if (this.isGrounded) {
                this.verticalVelocity = 0.75; // 1/10 del salto previo
                this.isGrounded = false;
                playAnimationIfNotPlaying("Jumping", 1.0);
              }
            } else if(this.joystickInput.distance <= 14) { 
              speed = 0.5; 
              this.character.position.y -= 0.3;
            }
            
            // Cachear cálculos trigonométricos para evitar recalcular
            const angleInRadians = (this.joystickInput.angle * Math.PI) / 180;
            const cosAngle = Math.cos(angleInRadians);
            const sinAngle = Math.sin(angleInRadians);
            
            // Aplicar sensibilidad mejorada para el joystick
            const sensitivity = this.isMobileDevice ? 1.2 : 1.0; // Mayor sensibilidad en móviles
            const distanceNormalized = Math.min(this.joystickInput.distance / 50, 1) * sensitivity;
            
            movementVector = movementVector.add(new Vector3(cosAngle, 0, sinAngle).scale(distanceNormalized));
  
      // No saltar aquí cuando no estamos en modo vuelo
      if (this.joystickInput.distance >= 50 && this.isGrounded && this.flyMode) {
                this.verticalVelocity = flyForce;
                this.isGrounded = false; 
            } 
          }
          else {
            // Lógica para modo vuelo - velocidad consistente
            speed = 1.8; // Velocidad rápida para modo vuelo
            const angleInRadians = (this.joystickInput.angle * Math.PI) / 180;
            const cosAngle = Math.cos(angleInRadians);
            const sinAngle = Math.sin(angleInRadians);
            const distanceNormalized = this.joystickInput.distance / 50;
            
            // En modo vuelo, permitir movimiento vertical con joystick
            movementVector = movementVector.add(new Vector3(cosAngle, 0, sinAngle).scale(distanceNormalized)); 
            
            if (this.joystickInput.distance >= 50) { 
              this.character.position.y += 0.5; // Ascenso suave
            } else if (this.joystickInput.distance >= 15) {  
              this.character.position.y += 0.2; // Ascenso más lento  
            } 
          }
            
          // Throttling de límites de cámara para reducir asignaciones constantes
          if (currentTime - this.lastCameraLimitsUpdate > this.cameraLimitsUpdateInterval) {
            this.camera.lowerBetaLimit = Math.PI / 3.0; // Límite inferior de beta (ángulo vertical) 
            this.camera.upperBetaLimit = Math.PI / 2.5;  // Límite superior de beta (ángulo vertical) 
            this.camera.lowerRadiusLimit = 60;         // Límite inferior de radio (distancia desde el objetivo)
            this.lastCameraLimitsUpdate = currentTime;
          }
        }
        else { 
          // Throttling de límites de cámara para reducir asignaciones constantes
          if (currentTime - this.lastCameraLimitsUpdate > this.cameraLimitsUpdateInterval) {
            this.camera.lowerBetaLimit = null; 
            this.camera.upperBetaLimit = Math.PI / 2.1; 
            this.camera.lowerRadiusLimit = 5;
            this.lastCameraLimitsUpdate = currentTime;
          }
        }

        // Separar las actualizaciones de Firebase del movimiento del personaje
        if (currentTime - this.lastExecutionTime >= this.fireInterval) {
          this.fireFunctions();
          this.lastExecutionTime = currentTime; // Actualiza el timestamp de la última ejecución
        }

        // Cachear direcciones de cámara para reducir cálculos
        const cameraStart = performance.now();
        const camera = this.scene.activeCamera;
        if (currentTime - this.cachedCameraDirections.lastUpdate > this.cachedCameraDirections.updateInterval) {
          this.cachedCameraDirections.forward = camera.getDirection(new Vector3(0, 0, 1)).normalize();
          this.cachedCameraDirections.right = camera.getDirection(new Vector3(1, 0, 0)).normalize();
          this.cachedCameraDirections.lastUpdate = currentTime;
        }

        let adjustedMovement = this.cachedCameraDirections.right.scale(movementVector.x)
          .add(this.cachedCameraDirections.forward.scale(movementVector.z));
        
        if (this.performanceProfiler.enabled) {
          this.performanceProfiler.cameraUpdate += performance.now() - cameraStart;
        }
        // Si estamos en modo planeta, proyectar movimiento al plano tangente de la esfera
        if (this.planetMode && this.character) {
          const up = this.character.position.normalize();
          const dot = Vector3.Dot(adjustedMovement, up);
          adjustedMovement = adjustedMovement.subtract(up.scale(dot));
        }
        movementVector = adjustedMovement;

        // Profiling: medir cálculo de movimiento
        const movementStart = performance.now();
        
        if (!this.planetMode) {
          // Comprobar suelo con raycast hacia abajo para detectar plataformas/escalables
          const rayOrigin = this.character.position.add(new Vector3(0, 0.1, 0));
          const ray = new Ray(rayOrigin, new Vector3(0, -1, 0), 2.5);
          const pick = this.scene.pickWithRay(ray, (m) => m.checkCollisions === true);

          const groundY = this.INITIALPOSITION + 1.3; // altura esperada del pie
          const onInitialGround = this.character.position.y <= groundY + 0.05;
          const onAnySurface = pick && pick.hit && pick.pickedPoint && (rayOrigin.y - pick.pickedPoint.y) <= 1.6;
          this.isGrounded = !!(onInitialGround || onAnySurface);

          // Aplicar gravedad solo si no está en modo vuelo
          if (!this.flyMode) {
            this.verticalVelocity += gravity;
          } else {
            this.verticalVelocity = 0;
          }
        } else {
          // En planeta: mantener pegado a la superficie y saltos cortos sin caída libre
          this.isGrounded = true;
        }

        // Optimizar cálculo de movimiento - evitar normalize() innecesario
        const movementLength = movementVector.length();
        let move: Vector3;
        
        if (movementLength > 0) {
          // Solo normalizar si hay movimiento
          move = movementVector.scale(speed / movementLength);
        } else {
          // Vector cero si no hay movimiento
          move = Vector3.Zero();
        }
  move.y = this.verticalVelocity;
        
        if (this.performanceProfiler.enabled) {
          this.performanceProfiler.movementCalc += performance.now() - movementStart;
        }
        
        // Profiling: medir colisiones (sospechoso principal)
        const collisionStart = performance.now();
        
        // CORREGIDO: Siempre usar colisiones para que el personaje no atraviese objetos
        // Solo optimizar la frecuencia de actualización en lugar de desactivar colisiones
        // Intento de "step up": si el movimiento horizontal está bloqueado, probar subir un poco
        const beforePos = this.character.position.clone();
        this.character.moveWithCollisions(move);
        const afterPos = this.character.position.clone();

        const movedHoriz = new Vector3(afterPos.x - beforePos.x, 0, afterPos.z - beforePos.z).length();
        const intendedHoriz = new Vector3(move.x, 0, move.z).length();
        const nearBlocked = intendedHoriz > 0.0001 && movedHoriz < intendedHoriz * 0.2; // casi bloqueado

        if (nearBlocked && this.isGrounded && !this.flyMode) {
          // Probar subir un pequeño escalón y volver a intentar
          const savedPos = this.character.position.clone();
          this.character.position.y += this.stepHeight;
          const retry = new Vector3(move.x, 0, move.z);
          const beforeRetry = this.character.position.clone();
          this.character.moveWithCollisions(retry);
          const movedRetry = new Vector3(
            this.character.position.x - beforeRetry.x, 0, this.character.position.z - beforeRetry.z
          ).length();
          if (movedRetry < intendedHoriz * 0.2) {
            // No se pudo subir, restaurar y no escalar
            this.character.position.copyFrom(savedPos);
          } else {
            // Ajuste: bajar un poco hasta apoyar
            this.character.position.y -= (this.stepHeight * 0.9);
          }
        }
        
        // En modo planeta no hay límites rectangulares; en plano sí
        if (!this.planetMode) {
          if (this.character.position.x > this.mapLimits.east) {
            this.character.position.x = this.mapLimits.east;
          } else if (this.character.position.x < this.mapLimits.west) {
            this.character.position.x = this.mapLimits.west;
          }
          
          if (this.character.position.z > this.mapLimits.north) {
            this.character.position.z = this.mapLimits.north;
          } else if (this.character.position.z < this.mapLimits.south) {
            this.character.position.z = this.mapLimits.south;
          }
        } else {
          // Reproyectar al radio del planeta después de mover
          this.alignCharacterToPlanet();
        }
        
        if (this.performanceProfiler.enabled) {
          this.performanceProfiler.collisionCheck += performance.now() - collisionStart;
        }
        
        // CORREGIDO: Usar INITIALPOSITION como referencia de suelo en lugar de 15
  if (!this.planetMode && this.character.position.y <= this.INITIALPOSITION + 2) {
            this.verticalVelocity = 0;
            this.isGrounded = true;
            // Asegurar que el personaje no se hunda en el suelo
            this.character.position.y = this.INITIALPOSITION + 1.3;

           
            if (movementVector.length() > 0) {
                const animationSpeed = speed === 0.7 ? 4.0 : speed === 2.0 ? 2.5 : 1.5; // Velocidad de animación ajustada
                playAnimationIfNotPlaying("Walk", animationSpeed);
            } else {
                playAnimationIfNotPlaying("Still");
            }
        }
        
        // Verificación de seguridad: si el personaje cae demasiado, reposicionarlo
    if (!this.planetMode && this.character.position.y < this.INITIALPOSITION - 50) {
            console.warn('⚠️ Personaje cayó al vacío, reposicionando...');
            this.character.position.y = this.INITIALPOSITION + 1.3;
            this.verticalVelocity = 0;
            this.isGrounded = true;
        }

        // Profiling: medir cálculos de rotación
        const rotationStart = performance.now();
        if (movementVector.length() > 0) {
            // OPTIMIZACIÓN: throttling de rotación para reducir cálculos trigonométricos
            if (currentTime - this.lastRotationUpdate > this.rotationUpdateInterval) {
              const direction = new Vector3(movementVector.x, 0, movementVector.z).normalize();
              const correctionAngle = Math.PI / 2;
              this.character.rotation.y = Math.atan2(-direction.x, -direction.z) + correctionAngle;
              this.lastRotationUpdate = currentTime;
            }

            if (this.isGrounded) {
                const animationSpeed = speed === 0.7 ? 4.0 : speed === 2.0 ? 2.5 : 1.5; // Velocidad de animación ajustada
                playAnimationIfNotPlaying("Walk", animationSpeed);
            }
        } else if (this.isGrounded) {
            playAnimationIfNotPlaying("Still");
        }
        
        if (this.performanceProfiler.enabled) {
          this.performanceProfiler.rotationCalc += performance.now() - rotationStart;
        }
        
        // Throttling de comprobación de obstrucciones para mejorar rendimiento
        if (currentTime - this.lastObstructionCheck > this.obstructionCheckInterval) {
          this.obstructionServ.checkObstruction(this.camera, this.character, this.houseModels, this.scene);
          this.lastObstructionCheck = currentTime;
        }
        
        // Profiling: reportar resultados cada 2 segundos durante movimiento
        if (this.performanceProfiler.enabled && movementVector.length() > 0) {
          if (currentTime - this.performanceProfiler.lastProfile > 2000) {
            console.log('🔍 PERFORMANCE PROFILING (durante movimiento):');
            console.log(`⚡ Colisiones: ${this.performanceProfiler.collisionCheck.toFixed(2)}ms`);
            console.log(`🎯 Rotación/Animación: ${this.performanceProfiler.rotationCalc.toFixed(2)}ms`);
            console.log(`📹 Cámara: ${this.performanceProfiler.cameraUpdate.toFixed(2)}ms`);
            console.log(`🧮 Movimiento: ${this.performanceProfiler.movementCalc.toFixed(2)}ms`);
            console.log(`🎮 FPS Actual: ${this.averageFPS}`);
            console.log('---');
            
            // Reset contadores
            this.performanceProfiler.collisionCheck = 0;
            this.performanceProfiler.rotationCalc = 0;
            this.performanceProfiler.cameraUpdate = 0;
            this.performanceProfiler.movementCalc = 0;
            this.performanceProfiler.lastProfile = currentTime;
          }
        }
    });
}


  async LoadArquitecture(position: any, rotation: any, scaling: any, name_glb: string, animations: [] | null): Promise<void> {
  const { meshes } = await SceneLoader.ImportMeshAsync(
      "",
      "../../assets/modelos3D/",
      `${name_glb}.glb`,
      this.scene
    );

    const mainMesh = meshes.find((mesh: any) => mesh instanceof Mesh) as Mesh | undefined;

  if (mainMesh) {
        const pos = typeof position === "string" ? position.split(",").map(Number) : [0, 0, 0];
        const rot = (rotation ?? "0, 0, 0").split(",").map(Number);
        const scaleValues = (scaling ?? "1, 1, 1").split(",").map(Number);

        mainMesh.position = new Vector3(pos[0], pos[1], pos[2]);
        mainMesh.rotation = new Vector3(rot[0], rot[1], rot[2]);
        mainMesh.scaling = new Vector3(scaleValues[0], scaleValues[1], scaleValues[2]);
        mainMesh.metadata = { isMainModel: true, name_glb };

        const isLOD = name_glb.startsWith('LOD');
        this.lodObjects.push({ mesh: mainMesh, isLOD });

        if (!this.houseModels) {
            this.houseModels = [];
        }

    let hasCollisionProxy = false;
    meshes.forEach((mesh: any) => {
          this.enableOutline(mesh);
          mesh.metadata = { isMainModel: false, name_glb };
      if (name_glb !== "grass") {
        // Usar mallas de colisión dedicadas (prefijo 'collision') para colisiones precisas y escalado
        if (mesh.name.startsWith("collision")) {
          mesh.checkCollisions = true;
          mesh.isVisible = false;
          hasCollisionProxy = true;
        } else {
          // Para mallas visuales, evitar colisiones para no obstaculizar con detalles pequeños
          mesh.checkCollisions = false;
        }
      }
      if (mesh.name === "__root__") {
        this.houseModels.push(mesh);
        // El root actúa como agrupador; las colisiones las llevan los hijos 'collision*'
        mesh.checkCollisions = false;
      }
          mesh.isPickable = true;
          
          // OPTIMIZATION: Disable shadows for architecture objects to improve performance
          // Only allow character and lights to cast/receive shadows
          mesh.receiveShadows = false; // Architecture objects don't receive shadows
          
          // Don't add architecture objects to main shadow generator for better performance
          // Only character and lights will cast shadows
          console.log(`📦 Architecture optimization: ${name_glb} - shadows disabled for better performance`);

          if (mesh.name.toLowerCase() === "light") {
              mainMesh.computeWorldMatrix(true);
              const lightPosition = mesh.getAbsolutePosition();

              // Limitar luces en dispositivos móviles
              if (this.isMobileDevice && this.lampPointLights.length >= this.getMaxLights()) {
                console.log("Límite de luces alcanzado en dispositivo móvil");
                return; // No crear más luces
              }

              const lampPointLight = new PointLight(
                  mainMesh.name + "_" + mesh.name + "_pointlight",
                  lightPosition,
                  this.scene
              );
              
              // Configuración de luces según el dispositivo y nivel de optimización
              if (this.isMobileDevice) {
                const intensityFactor = this.mobileOptimizationLevel === 'high' ? 0.5 : 
                                       this.mobileOptimizationLevel === 'medium' ? 0.7 : 0.8;
                const rangeFactor = this.mobileOptimizationLevel === 'high' ? 0.5 : 
                                   this.mobileOptimizationLevel === 'medium' ? 0.7 : 0.8;
                
                lampPointLight.intensity = 1.5 * intensityFactor;
                lampPointLight.range = 60 * rangeFactor;
              } else {
                lampPointLight.intensity = 1.5;
                lampPointLight.range = 60;
              }
              
              lampPointLight.diffuse = new Color3(1, 0.9, 0.7);
              lampPointLight.specular = new Color3(1, 0.9, 0.7);

              // Sombras solo en dispositivos potentes
              const enableShadows = !this.isMobileDevice || this.mobileOptimizationLevel === 'low';
              lampPointLight.shadowEnabled = enableShadows;
              
              let lampShadowGenerator: ShadowGenerator | null = null;

              if (enableShadows) {
                // Configurar sombras según el tipo de dispositivo
                const shadowMapSize = this.isMobileDevice ? 256 : 1024;
                lampShadowGenerator = new ShadowGenerator(shadowMapSize, lampPointLight);
                
                // Configuración ultra-simple para móviles
                lampShadowGenerator.useBlurExponentialShadowMap = false;
                lampShadowGenerator.usePoissonSampling = true;
                lampShadowGenerator.darkness = 0.6; // Sombras más marcadas para compensar la baja calidad
                
                // OPTIMIZATION: Don't add architecture meshes as shadow casters
                // This improves performance significantly
                
                // Fallback: si no hay mallas de colisión, activar colisiones en el mesh principal
                if (!hasCollisionProxy && name_glb !== "grass") {
                  mainMesh.checkCollisions = true;
                  console.warn(`[CollisionFallback] '${name_glb}' no tiene mallas 'collision*'. Activando colisiones en el mesh principal como medida temporal.`);
                }
                
                // Architecture objects don't cast shadows for optimization

                if (this.character && lampShadowGenerator) {
                    lampShadowGenerator.addShadowCaster(this.character);

                    this.character.getChildMeshes(false, (node) => {
                        if (node instanceof Mesh && lampShadowGenerator) {
                            lampShadowGenerator.addShadowCaster(node);
                        }
                        return true;
                    });
                }
                
                // OPTIMIZATION: Only add character and other lights as shadow casters
                // Architecture objects are excluded for better performance
                if ((!this.isMobileDevice || this.mobileOptimizationLevel === 'low') && lampShadowGenerator) {
                  const checkDistance = lampPointLight.range;  
                  this.scene.meshes.forEach(sceneMesh => {
                      // Only include character and other light meshes, exclude architecture
                      const isCharacterMesh = sceneMesh === this.character || 
                                            (this.character && this.character.getChildMeshes().includes(sceneMesh as Mesh));
                      const isLightMesh = sceneMesh.name.toLowerCase().includes("light");
                      
                      if ((isCharacterMesh || isLightMesh) &&
                          !sceneMesh.name.startsWith("collision") && sceneMesh.isVisible &&
                          sceneMesh.name !== "visibleGround" && sceneMesh.name !== "skyBox" &&
                          Vector3.Distance(sceneMesh.getAbsolutePosition(), lightPosition) < checkDistance &&
                          lampShadowGenerator) {
                          
                          lampShadowGenerator.addShadowCaster(sceneMesh, true);
                      }
                  });
                }
              }
              
              this.lampPointLights.push(lampPointLight); 
              this.lodLights.push(lampPointLight);

              if (mesh instanceof Mesh) {
                  const emissiveMaterial = new StandardMaterial(mesh.name + "_emissiveMat", this.scene);
                  emissiveMaterial.emissiveColor = new Color3(1, 0.9, 0.7);
                  mesh.material = emissiveMaterial;
              }
            }
          });
      } else {
        console.warn(`No se encontró un mesh principal en el archivo '${name_glb}.glb'.`);
      }
      
      // Actualizar objetos de frustum culling después de cargar nuevos elementos
      this.refreshFrustumCullingObjects();
  }
  public setLampLightsEnabled(enabled: boolean) {
    this.lampPointLights.forEach(light => {
      light.setEnabled(enabled);
    });
  }
  async LoadAccessories(): Promise<void> {    
    this.accessoryParent = new TransformNode("accessoryParent", this.scene);
    const { meshes: hatMeshes } = await SceneLoader.ImportMeshAsync(
      "",
      "../../assets/modelos3D/",
      "hat.glb",
      this.scene
    );
    const hat = hatMeshes[0] as Mesh;
    this.accessories["hat"] = hat;
    hat.setParent(this.accessoryParent); 
    hat.isVisible = false;   }

  public ChangeAccessory(accessoryKey: string): void {    
    Object.values(this.accessories).forEach((accessory) => {
      accessory.isVisible = false;
    });
    const selectedAccessory = this.accessories[accessoryKey];
    if (selectedAccessory) {
      selectedAccessory.isVisible = true;
    } else {
      console.warn(`El accesorio "${accessoryKey}" no existe.`);
    }
  }
  
  CreateThirdPersonCamera(): void {
    if (!this.character) return;  
    if(this.info.type === "base" || this.info.type === "finca"){
        const camera = new ArcRotateCamera(
        "thirdPersonCamera",
        Math.PI / 2, 
        Math.PI / 4, 
        40,          
        this.character.position.clone(),
        this.scene
      );
 
      camera.upperBetaLimit = Math.PI / 2.1;  // Límite superior de beta (ángulo vertical) 
      camera.upperRadiusLimit = 60;      // Límite superior de radio (distancia desde el objetivo)
      camera.lowerRadiusLimit = 5;

      camera.attachControl(this.canvas, true); 
      this.camera = camera;
      this.scene.activeCamera = this.camera;
      this.scene.onBeforeRenderObservable.add(() => {
        if(this.character){
          camera.target = this.character.position.add(new Vector3(0, 0.5, 0)); 
        }
        // Throttling del sistema de campos de pasto (menos frecuente)
        const currentTime = performance.now();
        if(this.character && currentTime - this.lastGrassUpdate > this.grassUpdateInterval) {
          // Sistema de campos amplios - menos impacto en rendimiento
          const shouldUpdateGrass = !this.isMobileDevice || this.averageFPS > 15;
          
          if (shouldUpdateGrass) {
            this.updateGrassAroundPlayer(this.scene, this.character.position);
          }
          this.lastGrassUpdate = currentTime;
        }
      });
    } 
    else{ 
      const camera = new FreeCamera(
        "camera",
        new Vector3(0, 2, 20),
        this.scene
      );   
      camera.attachControl(this.canvas, true);
      this.camera = camera;
      this.scene.activeCamera = this.camera;
      
      this.scene.onBeforeRenderObservable.add(() => {
        if (this.character) { 
          camera.setTarget(this.character.position);
          camera.position = new Vector3( 0, this.character.position.y + 7, 20);
        }
      });
    }      
  }
  
  adjustCanvasSize() {
    // Ajustar resolución para dispositivos móviles de forma más agresiva
    let width = window.innerWidth;
    let height = window.innerHeight;
    
    if (this.isMobileDevice) {
      // Reducir resolución según el nivel de optimización
      const scaleFactor = this.mobileOptimizationLevel === 'high' ? 0.5 : 
                         this.mobileOptimizationLevel === 'medium' ? 0.65 : 0.75;
      
      width = Math.floor(width * scaleFactor);
      height = Math.floor(height * scaleFactor);
      
      // Configurar hardware scaling level
      const hardwareScaling = this.mobileOptimizationLevel === 'high' ? 2 : 1.5;
      this.engine.setHardwareScalingLevel(hardwareScaling);
      
      console.log(`Resolución ajustada para móvil: ${width}x${height} (factor: ${scaleFactor}, hardware scaling: ${hardwareScaling})`);
    }
    
    this.canvas.width = width;
    this.canvas.height = height;
    this.engine.setSize(width, height);
  }

  public joystickInput: { angle: number | null; distance: number | null } = {
    angle: null,
    distance: null,
  };
  
  setJoystickInput(angle: number | null, distance: number | null) {
    // Aplicar filtro de suavizado para eliminar jitter
    if (angle !== null && distance !== null) {
      // Solo actualizar si hay un cambio significativo (deadzone)
      const deadzone = 5; // Zona muerta para eliminar micro-movimientos
      
      if (distance < deadzone) {
        this.joystickInput = { angle: null, distance: null };
      } else {
        // Ajustar suavizado según rendimiento: menos suavizado si FPS bajo
        let smoothingFactor = 0.2; // Factor base
        if (this.averageFPS < 20) {
          smoothingFactor = 0.05; // Muy poco suavizado si FPS muy bajo
        } else if (this.averageFPS < 30) {
          smoothingFactor = 0.1; // Poco suavizado si FPS bajo
        }
        
        if (this.joystickInput.angle !== null && this.joystickInput.distance !== null) {
          // Interpolación lineal para suavizar el movimiento
          this.joystickInput.angle = this.joystickInput.angle * smoothingFactor + angle * (1 - smoothingFactor);
          this.joystickInput.distance = this.joystickInput.distance * smoothingFactor + distance * (1 - smoothingFactor);
        } else {
          this.joystickInput = { angle, distance };
        }
      }
    } else {
      this.joystickInput = { angle: null, distance: null };
    }
  }
  
  async CreateSkybox() { 
    const skybox = MeshBuilder.CreateBox("skyBox", { size: 100.0 }, this.scene);
    const skyboxMaterial = new StandardMaterial("skyBox", this.scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.disableLighting = true;
    skybox.material = skyboxMaterial;    
      skyboxMaterial.reflectionTexture = new CubeTexture(
      "../../assets/textures/skybox/skybox",
      this.scene
    );
    skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
      skybox.material = skyboxMaterial;
      skybox.checkCollisions = false; 
      skybox.scaling = new Vector3(100, 100, 100); 

      const material = new StandardMaterial('material', this.scene);
      const texture = new Texture('../../assets/textures/mountains_1.png', this.scene);
      
     
      texture.hasAlpha = true;
      material.diffuseTexture = texture;
      
     
      material.useAlphaFromDiffuseTexture = true;
      
     
      material.emissiveColor = new Color3(1, 1, 1);
       
      this.gizmoManager = new GizmoManager(this.scene); 
      
      this.gizmoManager.positionGizmoEnabled = true; 
      this.gizmoManager.rotationGizmoEnabled = true; 
      this.gizmoManager.scaleGizmoEnabled = false; 
 
  }

  async loadJson() {
    if(this.info.type === "base"){
      this.jsonService.getJson(this.info.id).subscribe(
        async (data) => {
          this.jsonData = data;  
          if (this.jsonData.arquitectura && Array.isArray(this.jsonData.arquitectura)) {
            const promises = this.jsonData.arquitectura.map((casa: any) =>
              this.LoadArquitecture(casa.position, casa.rotation, casa.scaling, casa.name_glb, casa.animations)
            );

            await Promise.all(promises);
            if(this.houseModels != undefined){
              this.houseModels.forEach((mesh: AbstractMesh | null) => {
                if (mesh instanceof Mesh) { 
                  mesh.receiveShadows = true; 
                  this.shadowG.addShadowCaster(mesh); 
                } 
              });   
            }

          } else {
            console.error('La propiedad "arquitectura" no es un array:', this.jsonData.arquitectura);
          }
        },
        (error) => {
          console.error('Error al cargar el JSON:', error);
        }
      );
    }
    if(this.info.type === "finca"){
      this.firestore.collection("fincas").doc(this.info.id).get().subscribe((data:any) => {  
        data.data().arquitectura.forEach((casa: any) => {
          this.fincaData.push(casa);
          this.LoadArquitecture(casa.position, casa.rotation, null, casa.name_glb, null)
        });
      });
    }
  }

  private lastCharacterPosition: Vector3 | null = null; 

  fireFunctions(): void {
      if (!this.character) return;
  
      // Verificar si el personaje está en movimiento con mayor precisión
      const currentPosition = this.character.position.clone();
      if (this.lastCharacterPosition && currentPosition.equalsWithEpsilon(this.lastCharacterPosition, 0.005)) {
          // Si la posición no ha cambiado significativamente, no guardar información
          return;
      }
  
      // Actualizar la posición anterior
      this.lastCharacterPosition = currentPosition;
  
      // Optimizar las llamadas a Firebase usando debouncing
      if (this.sessionService.getItem("userInfo") === null) {
          this.firebaseService.setUser(this.character, null);
      } else {
          // Solo actualizar si el personaje se ha movido una distancia mínima
          this.firebaseService.updateUser(this.character, this.getActiveAnimations(this.character), this.info.id);
      }
  
      this.characterId = this.sessionService.getItem("id");
  }
  
  getActiveAnimations(character: Mesh | null): string[] {
    if (!character || !character.animations) { 
      return [];
    }
   
    if (character.name === "__root__") { 
      const activeAnimations = character.getChildMeshes().filter((animation) => { 
        return this.scene.getAnimationGroupByName(animation.name)?.isPlaying;
      });
      return activeAnimations.map((animation:any) => animation.name);
    } 
    else {
      const activeAnimations = character.animations.filter(animation => { 
        return this.scene.getAnimationGroupByName(animation.name)?.isPlaying;
      });
      return activeAnimations.map(animation => animation.name);
    } 
  }   
  async enablePhysics() { 
    const gravityVector = new Vector3(0, this.gravity, 0);
    const physicsPlugin = new CannonJSPlugin();
    this.scene.enablePhysics(gravityVector, physicsPlugin); 
  }
  public async changeCamera() { 
    this.xrHelper = await WebXRDefaultExperience.CreateAsync(this.scene, {
        uiOptions: {
            sessionMode: "inline",
        },   
        teleportationOptions: {
            useMainComponentOnly: true,
            timeToTeleport: 3000,
        },
    });  

    const xrCamera = this.xrHelper.baseExperience.camera; 

    // Ajustar la posición inicial de la cámara XR cuando se active la experiencia XR
    this.xrHelper.baseExperience.onStateChangedObservable.add((state) => {
        if (state === WebXRState.IN_XR && this.character) {
            xrCamera.position = this.character.position.clone(); 
            xrCamera.position.y = this.character.position.y + 4.3;
        }
    });

    if (!this.character) {
        console.warn("El personaje no está definido. La posición de la cámara XR no se puede ajustar.");
    }
}
  async addMesh(mesh: string) {
    if (!this.character && !this.camera) {
        console.warn("Character or camera not found.");
        return;
    }

    const { meshes } = await SceneLoader.ImportMeshAsync(
        "",
        "../../assets/modelos3D/",
        `${mesh}.glb`,
        this.scene
    );

    const mainMesh = meshes.find((mesh: any) => mesh instanceof Mesh) as Mesh | undefined;

    if (mainMesh) {
        let newPosition: Vector3;

        if (this.modeConstructor && this.camera) { 
            const forward = this.camera.getDirection(new Vector3(0, 0, 1)).normalize();
            const cameraPosition = this.camera.position.clone();
            const distance = 10;  
            newPosition = cameraPosition.add(forward.scale(distance));
            newPosition.y = this.INITIALPOSITION - 1; 
            newPosition.z = cameraPosition.z -50;
        } else if (this.character) { 
            const forward = this.character.forward.scale(2);
            newPosition = this.character.position.add(forward);
        } else {
            console.warn("No valid position context found.");
            return;
        }

        mainMesh.position = newPosition;
        mainMesh.metadata = { isMainModel: true, mesh };
        this.enableOutline(mainMesh);

        this.selectedMesh = mainMesh;  
        if (this.selectedMesh) {
            this.obstructionServ.fadeInMeshGroup(this.selectedMesh, this.scene); 
        } 
        this.obstructionServ.fadeOutMeshGroup(this.selectedMesh, this.scene); 
  
        this.scene.addMesh(mainMesh);
    } else {
        console.warn(`No se encontró un mesh de tipo 'Mesh' en el archivo '${mesh}.glb'.`);
    }
}
  modifySelected(item: string) {
    const MOVECOUNT = 1.5;
    const ROTATECOUNT = 0.5;

    if (this.selectedMesh) { 
      this.focusOnSelectedObject();
        if (this.activeAction) {
            console.warn(`Otra acción (${this.activeAction}) está activa. Espera a que termine.`);
            return;
        }

        if (item === "rotationLeft" || item === "rotationRight") { 
            this.activeAction = 'rotate';

            if (item === "rotationLeft") {
                this.selectedMesh.rotation.y += ROTATECOUNT;
            } else if (item === "rotationRight") {
                this.selectedMesh.rotation.y -= ROTATECOUNT;
            }
        } else if (item === "moveUp" || item === "moveDown" || item === "moveLeft" || item === "moveRight") {
            this.activeAction = 'move';

            if (item === "moveUp") {
                this.selectedMesh.position.z += MOVECOUNT;
            } else if (item === "moveDown") {
                this.selectedMesh.position.z -= MOVECOUNT;
            } else if (item === "moveLeft") {
                this.selectedMesh.position.x -= MOVECOUNT;
            } else if (item === "moveRight") {
                this.selectedMesh.position.x += MOVECOUNT;
            }
        } 
        setTimeout(() => {
            this.activeAction = null;
        }, 100); 
    }
  }
  public async saveModify() {
    this.home.isLoading = true;
    const meshes = this.scene.meshes;
    const uniqueMeshes = new Set<string>();
    const jsonData: any[] = []; 

    meshes.forEach(mesh => { 
        if (mesh.name === "__root__") { 
            const rotation = `${mesh.rotation.x}, ${mesh.rotation.y}, ${mesh.rotation.z}`;
            const position = `${mesh.position.x}, ${mesh.position.y}, ${mesh.position.z}`; 
            const scaling = `${mesh.scaling.x}, ${mesh.scaling.y}, ${mesh.scaling.z}`;
            const uniqueKey = `${rotation}-${position}-${scaling}`;

            if (!uniqueMeshes.has(uniqueKey) && mesh.metadata?.mesh != "unknown") {
                uniqueMeshes.add(uniqueKey);

                const name = mesh.metadata?.name_glb || mesh.metadata?.mesh || "unknown";
                const name_glb = mesh.metadata?.name_glb || mesh.metadata?.mesh || "unknown";

                const meshData = {
                    name,
                    name_glb,
                    rotation,
                    position,
                    scaling,
                    animations: mesh.metadata?.animations || []
                }; 

                jsonData.push(meshData); 
            }
        }
    });

    try { 
        if (this.info.type === "finca") { 
            await this.firebaseService.updateItem("fincas", this.info.id, { arquitectura: jsonData });
        } else { 
            console.log("JSON generado:", JSON.stringify({ arquitectura: jsonData }, null, 2));
        }
        
        this.home.isLoading = false;
        this.done = true;
        setTimeout(() => {
          this.done = false;
        }, 1000);
    } catch (error) {
        console.error('Error saving finca data:', error);
    }
}
  public modeConstructorOn() {
    if (this.modeConstructor) {
        this.modeConstructorOff();
        return;
    }
    this.modeConstructor = true;

   
    const constructionCamera = new ArcRotateCamera(
        'constructionCamera',
        Math.PI / 2,
        Math.PI / 5,
        100,        
        new Vector3(0, -80, 0),
        this.scene
    );

   
    constructionCamera.lowerAlphaLimit = Math.PI / 2;
    constructionCamera.upperAlphaLimit = Math.PI / 2;
    constructionCamera.lowerBetaLimit = Math.PI / 5; 
    constructionCamera.upperBetaLimit = Math.PI / 5; 
    constructionCamera.lowerRadiusLimit = 60;      
    constructionCamera.upperRadiusLimit = 60;      

   
    constructionCamera.target = new Vector3(0, this.INITIALPOSITION + 50, 0);
    constructionCamera.position = new Vector3(0, this.INITIALPOSITION + 50, 0);

   
    constructionCamera.attachControl(this.canvas, true);

   
    this.scene.activeCamera = constructionCamera;

   
    this.camera = constructionCamera;

   
    this.joystickInput = { angle: null, distance: null };

   
    let isDragging = false;
    let lastPointerPosition: Vector3 | null = null;
    let clickStartTime: number | null = null;

    this.scene.onPointerDown = (evt) => {
        if (evt.button === 0) {
            isDragging = true;
            lastPointerPosition = new Vector3(this.scene.pointerX, this.scene.pointerY, 0);
            clickStartTime = new Date().getTime(); 
            constructionCamera.target = new Vector3(constructionCamera.target.x, this.INITIALPOSITION + 50, constructionCamera.target.z);
            constructionCamera.position = new Vector3(constructionCamera.position.x, this.INITIALPOSITION + 50, constructionCamera.position.z);

            //this.resetCameraPosition(1000);
        }
    };

    this.scene.onPointerUp = () => {
        isDragging = false;

        const clickDuration = new Date().getTime() - (clickStartTime || 0);
        if (clickDuration < 200 && !this.activeAction) {
            const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
            if (pickResult?.hit && pickResult.pickedMesh && this.modeConstructor) {
                const selectedObject = pickResult.pickedMesh;

                if (selectedObject.name.startsWith("collisionBase") || selectedObject.metadata?.isBase
                    || selectedObject.name.startsWith("skyBox") || selectedObject.name.startsWith("grass")
                    || selectedObject.name.startsWith("cloud")) {
                    console.log("La base no puede ser seleccionada.");
                    if(this.selectedMesh) this.obstructionServ.fadeInMeshGroup(this.selectedMesh, this.scene);
                     

                    this.selectedMesh = null; 
                    return;
                }

                let parentObject = selectedObject;
                while (parentObject.parent) {
                    parentObject = parentObject.parent as Mesh;
                }

                if (this.selectedMesh) {
                    this.obstructionServ.fadeInMeshGroup(this.selectedMesh, this.scene);
                }
                this.selectedMesh = parentObject as Mesh;
                this.obstructionServ.fadeOutMeshGroup(this.selectedMesh, this.scene);

                this.focusOnSelectedObject();
                console.log('Objeto seleccionado:', this.selectedMesh.name);
            }
        }

        lastPointerPosition = null;
    };

    this.scene.onPointerMove = (evt) => {
        if (isDragging && lastPointerPosition) {
            const currentPointerPosition = new Vector3(this.scene.pointerX, this.scene.pointerY, 0);
            const delta = currentPointerPosition.subtract(lastPointerPosition);

           
            const moveSpeed = 0.1;
            this.camera.target.addInPlace(new Vector3(delta.x * moveSpeed, 0, -delta.y * moveSpeed));
            this.camera.position.addInPlace(new Vector3(delta.x * moveSpeed, 0, -delta.y * moveSpeed));

            lastPointerPosition = currentPointerPosition;
        }
    };
}
  public modeConstructorOff() {
    this.modeConstructor = false;

   
    this.CreateThirdPersonCamera();

   
    this.joystickInput = { angle: null, distance: null };

   
    this.scene.onPointerDown = undefined;
    this.scene.onPointerUp = undefined;
    this.scene.onPointerMove = undefined;
  }  
  public jump(force: number = 0.6, duration: number = 500, speed: number = 2): void {
    if (this.character && this.isGrounded) {
        const startY = this.character.position.y;
        const targetY = startY + force * speed; // Aumentar la altura según la velocidad
        const startTime = performance.now();

        this.isGrounded = false;
        let isJumping = true;

        const animateJump = (currentTime: number) => {
            if (!isJumping) return;

            const elapsedTime = currentTime - startTime;
            const t = Math.min(elapsedTime / (duration / speed), 1); // Ajustar la duración según la velocidad

            // Interpolar la posición Y del personaje
            const newY = startY + (targetY - startY) * t;
            if (this.character) this.character.position.y = newY;

            if (t < 1) {
                requestAnimationFrame(animateJump);
            } else {
                isJumping = false;
                this.applyGravity();
            }
        };

        requestAnimationFrame(animateJump);
    }
}

private applyGravity(): void { 
    const groundLevel = this.INITIALPOSITION;
    const fallSpeed = 5;

    const animateFall = () => {
        if (this.character) {
            this.character.position.y += this.gravity * fallSpeed;

            if (this.character.position.y <= groundLevel) {
                this.character.position.y = groundLevel;
                this.isGrounded = true;
            } else {
                requestAnimationFrame(animateFall);
            }
        }
    };

    requestAnimationFrame(animateFall);
}
public focusOnSelectedObject(duration: number = 1000): void {
  if (!this.selectedMesh || !this.camera) {
      console.warn("No hay un objeto seleccionado o la cámara no está definida.");
      return;
  }

  const targetPosition = this.selectedMesh.getBoundingInfo().boundingBox.centerWorld;
  const cameraStartPosition = this.camera.position.clone();
  const cameraStartTarget = (this.camera as ArcRotateCamera).target.clone();

  const startTime = performance.now();

  const animate = (currentTime: number) => {
      const elapsedTime = currentTime - startTime;
      const t = Math.min(elapsedTime / duration, 1);

     
      this.camera.position = Vector3.Lerp(cameraStartPosition, targetPosition.add(new Vector3(0, 5, 10)), t);

     
      (this.camera as ArcRotateCamera).target = Vector3.Lerp(cameraStartTarget, targetPosition, t);

      if (t < 1) {
          requestAnimationFrame(animate);
      }
  };

  requestAnimationFrame(animate);
}

public resetCameraPosition(duration: number = 1000): void {
  if (!this.camera) {
      console.warn("La cámara no está definida.");
      return;
  }

  const initialPosition = new Vector3(0, this.INITIALPOSITION + 50, 100); // Posición inicial de la cámara
  const initialTarget = new Vector3(0, this.INITIALPOSITION + 50, 0); // Target inicial de la cámara
  const cameraStartPosition = this.camera.position.clone();
  const cameraStartTarget = (this.camera as ArcRotateCamera).target.clone();

  const startTime = performance.now();

  const animateToInitial = (currentTime: number) => {
      const elapsedTime = currentTime - startTime;
      const t = Math.min(elapsedTime / duration, 1); // Progreso de la interpolación (0 a 1)

      // Interpolar la posición y el target de la cámara
      this.camera.position = Vector3.Lerp(cameraStartPosition, initialPosition, t);
      (this.camera as ArcRotateCamera).target = Vector3.Lerp(cameraStartTarget, initialTarget, t);

      if (t < 1) {
          requestAnimationFrame(animateToInitial); // Continuar la animación hasta que se complete
      }
  };

  requestAnimationFrame(animateToInitial);
}

public checkMapBoundaries(): void {
    if (!this.character || this.isLoadingScene) return;

    const position = this.character.position;

   
    if (position.z > this.mapLimits.north) {
        console.log("Cruzaste el límite norte. Cargando Pijao...");
        this.loadNewScene("pijaoQuindio", "base");
    }

   
    else if (position.z < this.mapLimits.south) {
        console.log("Cruzaste el límite sur. Cargando Génova...");
        this.loadNewScene("genovaQuindio", "base");
    }

   
    else if (position.x > this.mapLimits.east) {
        console.log("Cruzaste el límite este. Cargando Armenia...");
        this.loadNewScene("armeniaQuindio", "base");
    }

   
    else if (position.x < this.mapLimits.west) {
        console.log("Cruzaste el límite oeste. Cargando Salento...");
        this.loadNewScene("salentoQuindio", "base");
    }
}
private async loadNewScene(location: string, type: string): Promise<void> {
  if (this.isLoadingScene) return;
  this.isLoadingScene = true;

  try {
      const newSceneData = await this.jsonService.getJson(`${location}`).toPromise();
      console.log(`Cargando nueva escena: ${location}, tipo: ${type}`);

     
      const characterPosition = this.character?.position.clone();

     
      this.scene.meshes.forEach((mesh: any) => {
          if (mesh.name !== "collisionGround" && mesh.name !== "visibleGround" && mesh !== this.character) {
              mesh.dispose();
          }
      });

     
      const directionOffset = this.calculateDirectionOffset();

     
      if (newSceneData.arquitectura && Array.isArray(newSceneData.arquitectura)) {
          const promises = newSceneData.arquitectura.map((casa: any) =>
              this.LoadArquitecture(
                  this.applyOffsetToPosition(casa.position, directionOffset),
                  casa.rotation,
                  casa.scaling,
                  casa.name_glb,
                  casa.animations
              )
          );
          await Promise.all(promises);
      }

     
      if (this.character && characterPosition) {
          this.character.position = characterPosition;

         
          const collisionGroundY = this.INITIALPOSITION;
          const visibleGroundOffset = 1.3;
          if (this.character.position.y < collisionGroundY + visibleGroundOffset) {
              this.character.position.y = collisionGroundY + visibleGroundOffset;
          }

         
          if (this.camera && this.camera instanceof ArcRotateCamera) {
              this.camera.target = this.character.position.add(new Vector3(0, 0.5, 0));
          }
      }

      console.log("Nueva escena cargada correctamente.");
  } catch (error) {
      console.error("Error al cargar la nueva escena:", error);
  } finally {
      setTimeout(() => {
          this.isLoadingScene = false;
      }, 1000);
  }
}

private calculateDirectionOffset(): Vector3 {
  const offsetDistance = 100;
  const forward = this.scene.activeCamera?.getDirection(new Vector3(0, 0, 1)).normalize() || new Vector3(0, 0, 1);
  return forward.scale(offsetDistance);
}

private applyOffsetToPosition(position: string, offset: Vector3): Vector3 {
  const posArray = position.split(",").map(Number);
  const originalPosition = new Vector3(posArray[0], posArray[1], posArray[2]);
  return originalPosition.add(offset);
}
async CreateInfiniteGround(): Promise<void> {
  // Configurar dimensiones para terreno angosto e infinito
  const width = 200; // Terreno muy angosto (50 unidades de ancho)
  const height = 10000; // Muy largo en dirección Z (10,000 unidades)
  
  // Reducir subdivisiones drásticamente en dispositivos móviles
  let subdivisionsWidth = 5; // Pocas subdivisiones en ancho (angosto)
  let subdivisionsHeight = 100; // Más subdivisiones en largo para terreno infinito
  
  if (this.isMobileDevice) {
    subdivisionsWidth = 3; // Mínimo en ancho para móviles
    subdivisionsHeight = this.mobileOptimizationLevel === 'high' ? 20 : 
                        this.mobileOptimizationLevel === 'medium' ? 40 : 60;
  }

  // Crear el suelo visible
  const visibleGround = MeshBuilder.CreateGround("visibleGround", { 
    width, 
    height, 
    subdivisionsX: subdivisionsWidth,
    subdivisionsY: subdivisionsHeight 
  }, this.scene);

  // Material simplificado para móviles
  const visibleMaterial = new StandardMaterial("visibleMaterial", this.scene);
  
  if (this.isMobileDevice && this.mobileOptimizationLevel === 'high') {
    // Material ultra-simple para dispositivos de gama baja
    visibleMaterial.diffuseColor = new Color3(0.18, 0.45, 0.22);
    visibleMaterial.specularColor = new Color3(0, 0, 0); // Sin especular
  } else {
    // Material con texturas solo para dispositivos potentes
    visibleMaterial.diffuseColor = new Color3(0.18, 0.45, 0.22);
    visibleMaterial.emissiveColor = new Color3(0.06, 0.18, 0.08);
    visibleMaterial.specularColor = new Color3(0.06, 0.06, 0.06);
    visibleMaterial.specularPower = 8;

    // Normal map removido - sin bump texture para el terreno
  }

  visibleGround.material = visibleMaterial;
  visibleGround.position.y = this.INITIALPOSITION - 1;
  visibleGround.checkCollisions = false;
  visibleGround.isPickable = false;
  visibleGround.receiveShadows = !this.isMobileDevice || this.mobileOptimizationLevel === 'low';

  // Crear el suelo de colisión simplificado
  const collisionGround = MeshBuilder.CreateGround("collisionGround", { 
    width, 
    height, 
    subdivisionsX: Math.max(subdivisionsWidth, 2),
    subdivisionsY: Math.max(subdivisionsHeight / 2, 10)
  }, this.scene);
  const collisionMaterial = new StandardMaterial("collisionMaterial", this.scene);
  collisionMaterial.alpha = 0;

  collisionGround.material = collisionMaterial;
  collisionGround.position.y = this.INITIALPOSITION - 1; // coincide con visible ground
  collisionGround.checkCollisions = true;
  collisionGround.isPickable = false;

  // Crear base de soporte para el terreno
  await this.createTerrainBase(width, height);

  this.home.isLoading = false;
}

async CreateClouds(cant: number): Promise<void> { 
 
  const cloudMaterial = new StandardMaterial("cloudMaterial", this.scene);
  cloudMaterial.diffuseColor = new Color3(1, 1, 1);
  cloudMaterial.specularColor = new Color3(0, 0, 0);
  cloudMaterial.backFaceCulling = false;

  const cloudMeshes: Mesh[] = [];

 
  for (let i = 0; i < cant; i++) {
      const cloud = MeshBuilder.CreatePolyhedron(`cloud_${i}`, { type: 2, size: 10, sizeX: 1.5, sizeY: 1, sizeZ: 1.5 }, this.scene);
      cloud.material = cloudMaterial;
     
      const scaleX = Math.random() * 3 + 1;
      const scaleY = Math.random() * 0.6 + 0.4;
      const scaleZ = Math.random() * 2.5 + 1;

      cloud.scaling = new Vector3(scaleX * 7, scaleY * 7, scaleZ * 7);
      
      cloud.position = new Vector3(
          Math.random() * 500 - 250,
          Math.random() * 51 - this.INITIALPOSITION,
          Math.random() * 500 - 250
      );
      
      this.shadowGenerator.addShadowCaster(cloud);

      cloudMeshes.push(cloud);
  }

 
    this.scene.onBeforeRenderObservable.add(() => {
      cloudMeshes.forEach((cloud, index) => {
          cloud.position.x += 0.01 * (index % 2 === 0 ? 1 : -1);
          cloud.position.z += 0.01 * (index % 3 === 0 ? 1 : -1);

          if(this.modeConstructor && cloud.material){
            cloud.isVisible = false;
          }
         
          cloud.position.y += Math.sin(this.scene.getEngine().getDeltaTime() * 0.0001 * index) * 0.1;

         
          if (cloud.position.x > 250) cloud.position.x = -250;

          if (cloud.position.x < -250) cloud.position.x = 250;
          if (cloud.position.z > 250) cloud.position.z = -250;
          if (cloud.position.z < -250) cloud.position.z = 250;
      });
    });
  } 
  public runnerMode() {
    const camera = new ArcRotateCamera(
      'runnerCamera',
      Math.PI / 2,
      Math.PI / 3,
      30,
      new Vector3(0, 0, 0),
      this.scene
    );

    this.infiniteRunnerService.initializeRunner(this.scene, this.character!, camera);

    this.runRenderLoop();
  }
  private runRenderLoop() {
    // Activar optimización de Angular al iniciar el bucle de renderizado
    if (this.home && typeof this.home.startGameOptimization === 'function') {
      this.home.startGameOptimization();
    }

    this.engine.runRenderLoop(() => {
      // Monitor de FPS para optimización dinámica
      this.monitorPerformance();
      
      // Actualizar display de FPS
      this.updateFPSDisplay();
      
      // Actualizar Frustum Culling
      this.updateFrustumCulling();
      
      this.scene.render();
      if (this.character) {
        this.mountainService.checkPlayerPosition(
          this.scene,
          this.character.position,
          this.mapLimits,
          this.loadNewTerrain.bind(this)
        );
      }
    });
  }

  private monitorPerformance(): void {
    const currentTime = performance.now();
    this.frameCount++;
    
    // Actualizar FPS solo cada 200ms para reducir overhead
    if (currentTime - this.lastFrameTime >= 200) {
      this.averageFPS = Math.round(this.frameCount * 1000 / (currentTime - this.lastFrameTime));
      
      // Actualizar GUI de FPS solo si existe
      if (this.fpsText) {
        this.fpsText.text = `FPS: ${this.averageFPS}`;
      }
      
      // Ajustar dinámicamente la frecuencia del frustum culling según FPS
      if (this.averageFPS < 20) {
        this.frustumUpdateInterval = 300; // Frustum culling más lento si FPS muy bajo
        this.grassUpdateInterval = 2000; // Campos de pasto menos frecuentes
        this.grassLoadThreshold = 0.8; // Cargar campos más tarde
      } else if (this.averageFPS < 30) {
        this.frustumUpdateInterval = 200; // Frustum culling lento si FPS bajo
        this.grassUpdateInterval = 1500; // Campos de pasto moderado
        this.grassLoadThreshold = 0.75; // Cargar campos un poco más tarde
      } else if (this.averageFPS >= 45) {
        this.frustumUpdateInterval = 100; // Frustum culling normal si FPS bueno
        this.grassUpdateInterval = 1000; // Campos de pasto normal
        this.grassLoadThreshold = 0.7; // Cargar campos al 70%
      }
      
      this.frameCount = 0;
      this.lastFrameTime = currentTime;
    }
    
    // Optimización dinámica solo en móviles y si está habilitada
    if (!this.isMobileDevice || !this.autoOptimizationEnabled) return;
    
    // Solo hacer cambios de optimización cada 5 segundos (menos frecuente)
    if (currentTime - this.lastOptimizationCheck >= 5000) {
      // Solo hacer cambios si tenemos suficientes frames de muestra
      if (this.frameCount >= 30) {
        // Optimización dinámica basada en FPS - umbrales más conservadores
        if (this.averageFPS < 15 && this.mobileOptimizationLevel !== 'high') {
          console.log('FPS muy bajo detectado, aumentando optimizaciones...');
          this.increaseMobileOptimizations();
        } else if (this.averageFPS > 45 && this.mobileOptimizationLevel === 'high') {
          console.log('FPS estable, reduciendo algunas optimizaciones...');
          this.decreaseMobileOptimizations();
        }
      }
      this.lastOptimizationCheck = currentTime;
    }
  }

  private increaseMobileOptimizations(): void {
    // Aumentar el nivel de optimización
    if (this.mobileOptimizationLevel === 'low') {
      this.mobileOptimizationLevel = 'medium';
    } else if (this.mobileOptimizationLevel === 'medium') {
      this.mobileOptimizationLevel = 'high';
    }
    
    // Aplicar optimizaciones inmediatas
    this.applyDynamicOptimizations();
  }

  private decreaseMobileOptimizations(): void {
    // Solo mejorar si el rendimiento es consistentemente bueno
    if (this.averageFPS > 45) {
      if (this.mobileOptimizationLevel === 'high') {
        this.mobileOptimizationLevel = 'medium';
      }
      this.applyDynamicOptimizations();
    }
  }

  private applyDynamicOptimizations(): void {
    // Ajustar resolución dinámicamente
    this.adjustCanvasSize();
    
    // Desactivar algunas luces si es necesario
    if (this.mobileOptimizationLevel === 'high') {
      this.lampPointLights.forEach((light, index) => {
        if (index >= 2) { // Mantener solo las 2 primeras luces
          light.setEnabled(false);
        }
      });
    }
  }

  // ==================== SISTEMA DE FRUSTUM CULLING ====================
  
  /**
   * Inicializa el sistema de frustum culling
   */
  private initializeFrustumCulling(): void {
    if (!this.frustumCullingEnabled) return;
    
    // Configurar parámetros optimizados para dispositivos móviles
    if (this.isMobileDevice) {
      this.frustumUpdateThreshold = 2.0; // Menos actualizaciones frecuentes en móviles
      this.frustumUpdateInterval = 300; // Intervalo más largo para debugging
    } else {
      this.frustumUpdateThreshold = 1.0; // Más conservador en desktop también
      this.frustumUpdateInterval = 200; // Intervalo más largo para debugging
    }
    
    // Recopilar todos los meshes que deben ser considerados para frustum culling
    this.collectFrustumCullingObjects();
    
    console.log(`Frustum Culling inicializado con ${this.frustumCullingObjects.length} objetos`);
    console.log(`Configuración: threshold=${this.frustumUpdateThreshold}, interval=${this.frustumUpdateInterval}ms`);
    
    // Listar algunos objetos para debugging
    console.log('Objetos incluidos en Frustum Culling:', this.frustumCullingObjects.slice(0, 10).map(m => m.name));
  }
  
  /**
   * Recopila todos los objetos que deben ser evaluados para frustum culling
   */
  private collectFrustumCullingObjects(): void {
    this.frustumCullingObjects = [];
    
    // Obtener todos los meshes de la escena excepto el personaje y elementos UI
    this.scene.meshes.forEach(mesh => {
      if (this.shouldIncludeInFrustumCulling(mesh)) {
        this.frustumCullingObjects.push(mesh);
      }
    });
  }
  
  /**
   * Determina si un mesh debe ser incluido en el frustum culling
   */
  private shouldIncludeInFrustumCulling(mesh: AbstractMesh): boolean {
    // Excluir el personaje
    if (mesh === this.character) return false;
    
    // Excluir elementos del UI, terreno y elementos especiales
    if (mesh.name.includes('ui') || 
        mesh.name.includes('hud') || 
        mesh.name.includes('skybox') ||
        mesh.name.includes('ground') ||
        mesh.name.includes('terrain') ||
        mesh.name.includes('water') ||
        mesh.name.includes('collision') ||
        mesh.name.includes('cube') ||
        mesh.name.startsWith('__') ||
        mesh.name === 'visibleGround') return false;
    
    // Excluir luces y elementos invisibles
    if (!mesh.isVisible || !mesh.isEnabled()) return false;
    
    // Solo incluir meshes que realmente tienen geometría
    return mesh.getTotalVertices() > 0;
  }
  
  /**
   * Actualiza el frustum culling basado en la posición de la cámara
   */
  private updateFrustumCulling(): void {
    if (!this.frustumCullingEnabled || !this.camera) return;
    
    const currentTime = performance.now();
    const camera = this.camera;
    
    // Verificar si necesitamos actualizar (throttling)
    if (currentTime - this.lastFrustumUpdate < this.frustumUpdateInterval) return;
    
    // Verificar si la cámara se ha movido lo suficiente
    const currentPosition = camera.position.clone();
    const currentRotation = new Vector3(camera.alpha, camera.beta, camera.radius);
    
    const positionDelta = Vector3.Distance(currentPosition, this.lastCameraPosition);
    const rotationDelta = Vector3.Distance(currentRotation, this.lastCameraRotation);
    
    if (positionDelta < this.frustumUpdateThreshold && rotationDelta < 0.1) return;
    
    // Actualizar referencias de la cámara
    this.lastCameraPosition = currentPosition;
    this.lastCameraRotation = currentRotation;
    this.lastFrustumUpdate = currentTime;
    
    // Realizar frustum culling
    this.performFrustumCulling();
  }
  
  /**
   * Realiza el frustum culling en todos los objetos registrados
   */
  private performFrustumCulling(): void {
    if (!this.camera) return;
    
    // Usar el método incorporado de Babylon.js para frustum culling
    let culledCount = 0;
    let visibleCount = 0;
    
    // Procesar objetos en lotes para reducir el impacto por frame
    const batchSize = 20; // Procesar máximo 20 objetos por vez
    const objectsArray = Array.from(this.frustumCullingObjects);
    const totalObjects = objectsArray.length;
    
    // Usar un índice rotativo para procesar diferentes objetos cada frame
    if (!this.frustumBatchIndex) this.frustumBatchIndex = 0;
    
    const startIndex = this.frustumBatchIndex;
    const endIndex = Math.min(startIndex + batchSize, totalObjects);
    
    // Evaluar solo un lote de objetos
    for (let i = startIndex; i < endIndex; i++) {
      const mesh = objectsArray[i];
      if (!mesh || mesh.isDisposed()) continue;
      
      // Usar el método nativo isInFrustum de Babylon.js
      const isInFrustum = this.camera.isInFrustum(mesh);
      
      // Establecer visibilidad basada en frustum culling
      if (isInFrustum && !mesh.isEnabled()) {
        mesh.setEnabled(true);
        visibleCount++;
      } else if (!isInFrustum && mesh.isEnabled()) { 
          mesh.setEnabled(false);
          culledCount++; 
      }
    }
    
    // Actualizar índice para el próximo frame
    this.frustumBatchIndex = endIndex >= totalObjects ? 0 : endIndex;
  }
  
  /**
   * Actualiza la lista de objetos para frustum culling (llamar cuando se añaden/eliminan objetos)
   */
  public refreshFrustumCullingObjects(): void {
    this.collectFrustumCullingObjects();
  }
  
  /**
   * Habilita o deshabilita el frustum culling
   */
  public setFrustumCullingEnabled(enabled: boolean): void {
    this.frustumCullingEnabled = enabled;
    
    if (!enabled) {
      // Si se deshabilita, mostrar todos los objetos
      this.frustumCullingObjects.forEach(mesh => {
        if (mesh && !mesh.isDisposed()) {
          mesh.setEnabled(true);
        }
      });
      console.log('Frustum Culling deshabilitado - todos los objetos restaurados');
    } else {
      // Si se habilita, recopilar objetos nuevamente
      this.collectFrustumCullingObjects();
      console.log(`Frustum Culling habilitado con ${this.frustumCullingObjects.length} objetos`);
    }
    
    console.log(`Frustum Culling ${enabled ? 'habilitado' : 'deshabilitado'}`);
  }

  /**
   * Método para habilitar frustum culling de manera segura (para testing)
   */
  public enableFrustumCullingSafely(): void {
    console.log('Habilitando Frustum Culling de manera segura...');
    this.frustumCullingEnabled = true;
    this.collectFrustumCullingObjects();
    
    // Mostrar estadísticas iniciales
    const stats = this.getFrustumCullingStats();
    console.log('Estadísticas iniciales:', stats);
  }

  /**
   * Configura los parámetros del frustum culling
   */
  public configureFrustumCulling(options: {
    updateThreshold?: number;
    updateInterval?: number;
  }): void {
    if (options.updateThreshold !== undefined) {
      this.frustumUpdateThreshold = options.updateThreshold;
    }
    if (options.updateInterval !== undefined) {
      this.frustumUpdateInterval = options.updateInterval;
    }
    
    console.log(`Frustum Culling configurado: threshold=${this.frustumUpdateThreshold}, interval=${this.frustumUpdateInterval}ms`);
  }

  /**
   * Obtiene estadísticas del frustum culling
   */
  public getFrustumCullingStats(): { totalObjects: number; culledObjects: number; visibleObjects: number } {
    const totalObjects = this.frustumCullingObjects.length;
    const visibleObjects = this.frustumCullingObjects.filter(mesh => mesh && !mesh.isDisposed() && mesh.isEnabled()).length;
    const culledObjects = totalObjects - visibleObjects;
    
    return { totalObjects, culledObjects, visibleObjects };
  }

  private loadNewTerrain(direction: string): void {
    console.log(`Nuevo terreno cargado en dirección ${direction}`);
    // Aquí puedes cargar un nuevo pueblo o terreno adicional
  }

  initializeAfkDetection(): void {
    const resetAfkTimer = () => {
      if (this.afkTimeout) {
        clearTimeout(this.afkTimeout);
      }

      // Reiniciar el temporizador
      this.afkTimeout = setTimeout(() => {
        this.handleAfk();
      }, this.afkTimeLimit);
    };

    // Detectar actividad del jugador
    window.addEventListener('mousemove', resetAfkTimer);
    window.addEventListener('keydown', resetAfkTimer);
    window.addEventListener('mousedown', resetAfkTimer);

    // Iniciar el temporizador al cargar la escena
    resetAfkTimer();
  }

  private handleAfk(): void {
    console.log('Jugador inactivo. Eliminando datos de Firebase...');
    
    // Eliminar datos del jugador de Firebase
    if (this.characterId) {
      this.firebaseService.deleteUser(this.characterId, this.info.id);
    }

    // Opcional: Mostrar un mensaje o realizar otras acciones
  }
  private removeCharacterFromFirebase(): void {
    if (this.characterId) {
      console.log("Eliminando datos del personaje de Firebase...");
      this.firebaseService.deleteUser(this.characterId, this.info.id);
    }
  }
  async enableOcclusionCulling(): Promise<void> {
    // Solo habilitar oclusión en dispositivos de escritorio para mejor rendimiento
    if (this.isMobileDevice) {
      console.log("Oclusión deshabilitada en dispositivos móviles para mejor rendimiento.");
      return;
    }
    
    this.scene.meshes.forEach((mesh: any) => {
      if (mesh instanceof Mesh) {
        // Excluir el skybox de la detección de oclusión
        if (mesh.name === "skyBox") {
          console.log("Excluyendo el skybox de la detección de oclusión.");
          return;
        }

        // Habilitar la detección de oclusión para otras mallas
        mesh.occlusionRetryCount = 2; // Número de intentos antes de considerar la malla oculta
        mesh.occlusionType = AbstractMesh.OCCLUSION_TYPE_OPTIMISTIC; // Optimista para rendimiento
        mesh.occlusionQueryAlgorithmType = AbstractMesh.OCCLUSION_ALGORITHM_TYPE_CONSERVATIVE; // Algoritmo conservador
 
      }
    });
  }  
 
  private optimizeMeshesByDistance(): void {
    const player = this.character; // El jugador (Mesh principal)
    const maxDistance = 150; // Distancia máxima para mostrar los Mesh

    if (!player) {
        console.warn("El jugador no está definido.");
        return;
    }

    this.scene.onBeforeRenderObservable.add(() => {
        // Crear un conjunto para rastrear los objetos padres ya procesados
        const processedParents = new Set<AbstractMesh>();

        this.scene.meshes.forEach((mesh: any) => {
            // Obtener el objeto padre (o el propio objeto si no tiene padre)
            const parentMesh = mesh.parent ? (mesh.parent as AbstractMesh) : mesh;

            // Asegurarse de no procesar el mismo objeto padre varias veces
            if (processedParents.has(parentMesh)) {
                return;
            } 
            processedParents.add(parentMesh); 
            // Excluir el jugador, el cielo y otros objetos importantes
            if (
                parentMesh === player ||
                parentMesh.name === "skyBox" ||
                parentMesh.name === "visibleGround" ||
                parentMesh.name === "collisionGround"||
                parentMesh.name.startsWith("cloud")||
                parentMesh.name.startsWith("__root__")
            ) {
                parentMesh.isVisible = true; // Asegurarse de que estos objetos siempre sean visibles
                return;
            } 

            // Calcular la distancia entre el jugador y el objeto padre
            const distance = Vector3.Distance(player.position, parentMesh.position);

            // Ocultar o mostrar el objeto padre (y sus hijos) según la distancia
            if (distance > maxDistance) {
                parentMesh.getChildMeshes().forEach((child: any) => {
                  child.isVisible = false;
                });
                parentMesh.isVisible = false; // Ocultar el objeto padre
            } else {
                parentMesh.getChildMeshes().forEach((child: any) => {
                    if (!child.name.startsWith("collision")) {
                        child.isVisible = true;
                    }
                });
                parentMesh.isVisible = true; // Mostrar el objeto padre
            }
        });
    });
  }
  
  public async startBirdMiniGame() {
    const positionActual = this.character?.position.clone() || new Vector3(0,0,0);
    const rotationActual = this.character?.rotation.clone() || new Vector3(0,0,0);

    if (this.character) {
      this.character.dispose();
    }
    const result = await SceneLoader.ImportMeshAsync(
      "",
      "../../assets/modelos3D/",
      "ave_1.glb",
      this.scene
    );
    this.character = result.meshes[0] as Mesh;
    this.character.position = positionActual; 
    this.character.rotation = rotationActual; 
    this.animationGroups = result.animationGroups;

    // Reproduce las animaciones que quieras al iniciar (por ejemplo, las dos primeras)
    if (this.animationGroups.length > 0) {
      this.animationGroups[0].start(true); // Primera animación en loop
    }
    if (this.animationGroups.length > 1) {
      this.animationGroups[1].start(true); // Segunda animación en loop
    }
    if (this.camera) {
      this.camera.lockedTarget = this.character;
      this.camera.radius = 10;  
      this.camera.heightOffset = 3; 
      this.camera.target = this.character.position;
    } 
    
    this.flyMode = true;
  }  
  
createGrassBlade(scene: Scene): Mesh {
    const blade = MeshBuilder.CreateCylinder("grassBlade", {
      height: 5,
      diameterTop: 0.1,
      diameterBottom: 0.30,
      tessellation: 3 // Triangular
    }, scene);

    blade.position.y = this.INITIALPOSITION; // Que salga del suelo

    // Material verde
    const mat = new StandardMaterial("grassMat", scene);
    mat.diffuseColor = new Color3(0.2, 0.7, 0.2);
    mat.emissiveColor = new Color3(0.1, 0.3, 0.1);
    blade.material = mat;

    return blade;
  } 
  public createGrassPatch(scene: Scene, patchWidth: number, patchLength: number): Mesh[] {
    const blades: Mesh[] = [];
    const clustersPerPatch = Math.max(1, Math.floor((patchWidth * patchLength) / 100)); // Densidad adaptativa
    
    // Reducir hojas de pasto según el nivel de optimización
    let bladesPerCluster: number;
    if (this.isMobileDevice) {
      bladesPerCluster = this.mobileOptimizationLevel === 'high' ? 1 : 
                        this.mobileOptimizationLevel === 'medium' ? 1 + Math.floor(Math.random() * 1) :
                        1 + Math.floor(Math.random() * 2);
    } else {
      bladesPerCluster = 2 + Math.floor(Math.random() * 2);
    }

    // Generar pasto distribuido en el área angosta
    for (let c = 0; c < clustersPerPatch; c++) {
      // Distribuir pasto en el área angosta: ancho limitado (-25 a +25), largo extendido
      const clusterCenterX = (Math.random() - 0.5) * Math.min(patchWidth, 40); // Limitar ancho a 40 unidades
      const clusterCenterZ = (Math.random() - 0.5) * patchLength; // Distribuir a lo largo

      for (let i = 0; i < bladesPerCluster; i++) {
        const blade = this.createGrassBlade(scene);
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 1.2;
        blade.position.x = clusterCenterX + Math.cos(angle) * radius;
        blade.position.z = clusterCenterZ + Math.sin(angle) * radius;
        blade.position.y = this.INITIALPOSITION;
        blade.rotation.y = Math.random() * Math.PI * 2;
        this.animateGrassBlade(scene, blade);
        blades.push(blade);
      }
    }
    return blades;
  }
  animateGrassBlade(scene: Scene, blade: Mesh) { 
    scene.onBeforeRenderObservable.add(() => {
      const time = performance.now() * 0.001;
      const windStrength = 0.15;
      const windSpeed = 1.0;
      let targetRotation = Math.sin(time * windSpeed) * windStrength;

      // Si hay personaje y está cerca, inclina el pasto lejos del personaje
      if (this.character) {
        const dist = Vector3.Distance(this.character.position, blade.position);
        if (dist < 2) { 
          const dir = blade.position.subtract(this.character.position).normalize(); 
          targetRotation += dir.x * 0.5;
        }
      }

      // Interpolación suave hacia la rotación objetivo
      blade.rotation.x += (targetRotation - blade.rotation.x) * 0.2;
    });
  }
  public updateGrassAroundPlayer(scene: Scene, playerPosition: Vector3) {
    // Sistema de campos amplios: calcular en qué campo está el jugador
    const currentField = Math.floor(playerPosition.z / this.grassFieldSize);
    
    // Solo procesar si el jugador ha cambiado de campo o es necesario cargar el siguiente
    if (currentField !== this.currentGrassField) {
      this.currentGrassField = currentField;
    }
    
    // Calcular progreso dentro del campo actual (0.0 a 1.0)
    const fieldProgress = (playerPosition.z % this.grassFieldSize) / this.grassFieldSize;
    
    // Cargar campo actual si no está cargado
    if (!this.loadedGrassFields.has(currentField)) {
      this.loadGrassField(scene, currentField);
    }
    
    // Carga predictiva: cargar siguiente campo al 70% del recorrido
    const nextField = currentField + (playerPosition.z > 0 ? 1 : -1);
    if (fieldProgress >= this.grassLoadThreshold && !this.loadedGrassFields.has(nextField)) {
       this.loadGrassField(scene, nextField);
    }
    
    // Descargar campos lejanos para liberar memoria
    const fieldsToUnload = Array.from(this.loadedGrassFields).filter(field => 
      Math.abs(field - currentField) > 2 // Mantener solo ±2 campos alrededor del actual
    );
    
    fieldsToUnload.forEach(field => {
      this.unloadGrassField(field);
    });
  }

  // Cargar un campo completo de pasto
  private loadGrassField(scene: Scene, fieldIndex: number): void {
    const fieldKey = `field_${fieldIndex}`;
    
    if (this.grassPatches.has(fieldKey)) return; // Ya existe
    
    const fieldCenterZ = fieldIndex * this.grassFieldSize;
    const fieldBlades: Mesh[] = [];
    
    // Generar pasto distribuido en el campo (50 unidades de ancho x 200 de largo)
    const grassDensity = this.isMobileDevice ? 
      (this.mobileOptimizationLevel === 'high' ? 10 : 
       this.mobileOptimizationLevel === 'medium' ? 20 : 30) : 50;
    
    for (let i = 0; i < grassDensity; i++) {
      // Distribuir pasto dentro del campo
      const x = (Math.random() - 0.5) * 150; // Ancho limitado a ±20 unidades
      const z = fieldCenterZ + (Math.random() - 0.5) * this.grassFieldSize; // Distribuir en todo el campo
      
      const blade = this.createGrassBlade(scene);
      blade.position.x = x;
      blade.position.z = z;
      blade.position.y = this.INITIALPOSITION;
      blade.rotation.y = Math.random() * Math.PI * 2;
      this.animateGrassBlade(scene, blade);
      fieldBlades.push(blade);
    }
    
    this.grassPatches.set(fieldKey, fieldBlades);
    this.loadedGrassFields.add(fieldIndex);
    
   }

  // Descargar un campo de pasto para liberar memoria
  private unloadGrassField(fieldIndex: number): void {
    const fieldKey = `field_${fieldIndex}`;
    const fieldBlades = this.grassPatches.get(fieldKey);
    
    if (fieldBlades) {
      fieldBlades.forEach(blade => {
        blade.dispose();
      });
      this.grassPatches.delete(fieldKey);
      this.loadedGrassFields.delete(fieldIndex);
      console.log(`Campo de pasto ${fieldIndex} descargado`);
    }
  }

  // Método de limpieza agresiva para optimización extrema
  public clearDistantGrassFields(playerPosition: Vector3): void {
    const currentField = Math.floor(playerPosition.z / this.grassFieldSize);
    const maxDistance = this.isMobileDevice ? 1 : 3; // Mantener menos campos en móviles
    
    const fieldsToUnload = Array.from(this.loadedGrassFields).filter(field => 
      Math.abs(field - currentField) > maxDistance
    );
    
    fieldsToUnload.forEach(field => {
      this.unloadGrassField(field);
    });
    
    if (fieldsToUnload.length > 0) {
      console.log(`Limpieza: ${fieldsToUnload.length} campos de pasto remotos eliminados`);
    }
  }

  // Métodos de debug para controlar profiling
  public enablePerformanceProfiling(): void {
    this.performanceProfiler.enabled = true;
    console.log('🔍 Performance profiling ACTIVADO - muévete para ver el análisis');
  }

  public disablePerformanceProfiling(): void {
    this.performanceProfiler.enabled = false;
    console.log('🔍 Performance profiling DESACTIVADO');
  }

  public getPerformanceReport(): void {
    console.log('📊 REPORTE DE RENDIMIENTO ACTUAL:');
    console.log(`FPS: ${this.averageFPS}`);
    console.log(`Campos de pasto cargados: ${this.loadedGrassFields.size}`);
    console.log(`Objetos en frustum culling: ${this.frustumCullingObjects.length}`);
    console.log(`Nivel de optimización móvil: ${this.mobileOptimizationLevel}`);
    console.log(`Dispositivo móvil: ${this.isMobileDevice ? 'Sí' : 'No'}`);
    
    if (this.character) {
      console.log('🎮 INFORMACIÓN DEL PERSONAJE:');
      console.log(`Posición: X=${this.character.position.x.toFixed(2)}, Y=${this.character.position.y.toFixed(2)}, Z=${this.character.position.z.toFixed(2)}`);
      console.log(`INITIALPOSITION: ${this.INITIALPOSITION}`);
      console.log(`Posición esperada del suelo: ${this.INITIALPOSITION + 1.3}`);
      console.log(`Está en el suelo: ${this.isGrounded ? 'Sí' : 'No'}`);
      console.log(`Velocidad vertical: ${this.verticalVelocity.toFixed(2)}`);
    }
  }

  // Método de emergencia para reposicionar el personaje
  public resetCharacterPosition(): void {
    if (this.character) {
      this.character.position = new Vector3(0, this.INITIALPOSITION + 1.3, 0);
      this.verticalVelocity = 0;
      this.isGrounded = true;
      console.log('🔄 Personaje reposicionado correctamente');
    }
  }

  // Método para inicializar el display de FPS
  private initializeFPSDisplay(): void {
    // Crear GUI texture
    this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    
    // Crear texto para mostrar FPS
    this.fpsText = new TextBlock();
    this.fpsText.text = "FPS: 60";
    this.fpsText.color = "white";
    this.fpsText.fontSize = this.isMobileDevice ? 16 : 20;
    this.fpsText.fontFamily = "Arial";
    this.fpsText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.fpsText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.fpsText.paddingLeft = "10px";
    this.fpsText.paddingTop = "10px";
    
    // Agregar el texto al GUI
    this.guiTexture.addControl(this.fpsText);
  }

  // Método para actualizar el display de FPS
  public updateFPSDisplay(): void {
    if (this.showFPS && this.fpsText) {
      this.fpsText.text = `FPS: ${Math.round(this.averageFPS)} Joystick Distance: ${this.joystickInput.distance}`;
      
      // Cambiar color basado en el rendimiento
      if (this.averageFPS >= 50) {
        this.fpsText.color = "green";
      } else if (this.averageFPS >= 30) {
        this.fpsText.color = "yellow";
      } else {
        this.fpsText.color = "red";
      }
    }
  }

  // Método para alternar visibilidad del FPS
  public toggleFPSDisplay(): void {
    this.showFPS = !this.showFPS;
    if (this.fpsText) {
      this.fpsText.isVisible = this.showFPS;
    }
  }

  // Método de debug para verificar configuración de colisiones
  public debugCollisionSettings(): void {
    console.log('🔍 DIAGNÓSTICO DE COLISIONES:');
    console.log('='.repeat(50));
    
    // Verificar configuración de la escena
    console.log(`🌍 Escena - Colisiones habilitadas: ${this.scene.collisionsEnabled}`);
    
    // Verificar configuración del personaje
    if (this.character) {
      console.log(`👤 Personaje:`);
      console.log(`   - checkCollisions: ${this.character.checkCollisions}`);
      console.log(`   - Posición: (${this.character.position.x.toFixed(2)}, ${this.character.position.y.toFixed(2)}, ${this.character.position.z.toFixed(2)})`);
    } else {
      console.log('❌ Personaje no encontrado');
    }
    
    // Verificar objetos con colisiones
    let collisionObjects = 0;
    let visibleObjects = 0;
    
    this.scene.meshes.forEach(mesh => {
      if (mesh.checkCollisions) {
        collisionObjects++;
        if (mesh.isVisible) {
          visibleObjects++;
        }
        
        // Mostrar objetos principales con colisiones
        if (mesh.name.includes('Ground') || mesh.name.includes('collision') || mesh.name === '__root__') {
          console.log(`🏗️  ${mesh.name}: checkCollisions=${mesh.checkCollisions}, visible=${mesh.isVisible}`);
        }
      }
    });
    
    console.log(`📊 Total objetos con colisiones: ${collisionObjects} (${visibleObjects} visibles)`);
    
    // Verificar terreno específicamente
    const collisionGround = this.scene.getMeshByName('collisionGround');
    const visibleGround = this.scene.getMeshByName('visibleGround');
    
    if (collisionGround) {
      console.log(`🌱 Terreno de colisión: checkCollisions=${collisionGround.checkCollisions}, Y=${collisionGround.position.y}`);
    } else {
      console.log('❌ Terreno de colisión no encontrado');
    }
    
    if (visibleGround) {
      console.log(`🌿 Terreno visible: checkCollisions=${visibleGround.checkCollisions}, Y=${visibleGround.position.y}`);
    } else {
      console.log('❌ Terreno visible no encontrado');
    }
    
    console.log('='.repeat(50));
    console.log('💡 Si las colisiones no funcionan, verifica que los objetos tengan checkCollisions=true');
  }

  /**
   * Enables a cartoon-style outline on a mesh.
   */
  private enableOutline(mesh: AbstractMesh): void {
    mesh.renderOutline = true;
    mesh.outlineColor = Color3.Black();
    mesh.outlineWidth = 0.03;
  }

  /**
   * Crea una base de soporte estilo low-poly con profundidad infinita
   */
  private async createTerrainBase(terrainWidth: number, terrainLength: number): Promise<void> {
    const infiniteDepth = 500; // Profundidad considerable hacia abajo
    const baseY = this.INITIALPOSITION - infiniteDepth / 2 + 15; // Centrar la base debajo del terreno visible

    // Material low-poly con colores planos y sin especular
    const lowPolyBaseMaterial = new StandardMaterial("lowPolyBaseMaterial", this.scene);
    lowPolyBaseMaterial.diffuseColor = new Color3(0.35, 0.25, 0.2); // Marrón low-poly
    lowPolyBaseMaterial.specularColor = new Color3(0, 0, 0); // Sin brillo especular
    lowPolyBaseMaterial.emissiveColor = new Color3(0, 0, 0); // Sin emisión
    lowPolyBaseMaterial.backFaceCulling = true; // Mejorar rendimiento

    const lowPolyRockMaterial = new StandardMaterial("lowPolyRockMaterial", this.scene);
    lowPolyRockMaterial.diffuseColor = new Color3(0.45, 0.4, 0.35); // Gris piedra low-poly
    lowPolyRockMaterial.specularColor = new Color3(0, 0, 0);
    lowPolyRockMaterial.emissiveColor = new Color3(0, 0, 0);
    lowPolyRockMaterial.backFaceCulling = true;

    const lowPolyStoneMaterial = new StandardMaterial("lowPolyStoneMaterial", this.scene);
    lowPolyStoneMaterial.diffuseColor = new Color3(0.3, 0.3, 0.3); // Gris oscuro low-poly
    lowPolyStoneMaterial.specularColor = new Color3(0, 0, 0);
    lowPolyStoneMaterial.emissiveColor = new Color3(0, 0, 0);
    lowPolyStoneMaterial.backFaceCulling = true;

    // Crear base principal con profundidad considerable pero manejable
    const mainBase = MeshBuilder.CreateBox("terrainMainBase", { 
      width: terrainWidth + 15, // Más ancha que el terreno
      height: infiniteDepth, // Profundidad considerable
      depth: terrainLength 
    }, this.scene);

    mainBase.material = lowPolyBaseMaterial;
    mainBase.position.y = baseY;
    mainBase.checkCollisions = false;
    mainBase.isPickable = false;
    mainBase.receiveShadows = false; // Sin sombras para look low-poly

    console.log(`🎮 Base principal creada en Y: ${baseY}, profundidad: ${infiniteDepth}`);

    // Crear menos capas para evitar problemas de renderizado
    const numLayers = this.isMobileDevice ? 2 : 3;
    const layerHeight = infiniteDepth / numLayers;

    for (let i = 0; i < numLayers; i++) {
      const layerY = baseY + (layerHeight * i) - (infiniteDepth / 2) + (layerHeight / 2);
      
      // Alternar materiales para crear estratos
      const layerMaterial = i % 3 === 0 ? lowPolyRockMaterial : 
                           i % 3 === 1 ? lowPolyStoneMaterial : lowPolyBaseMaterial;
      
      const layer = MeshBuilder.CreateBox(`terrainLayer_${i}`, {
        width: terrainWidth + 20 + (i * 2), // Cada capa más ancha
        height: layerHeight * 0.8, // Pequeño gap entre capas
        depth: terrainLength + (i * 5) // Cada capa más profunda
      }, this.scene);
      
      layer.material = layerMaterial;
      layer.position.y = layerY;
      layer.checkCollisions = false;
      layer.isPickable = false;
      layer.receiveShadows = false;
      
      console.log(`📦 Capa ${i} creada en Y: ${layerY}`);
    }

    // Crear pilares low-poly simplificados
    const numPillars = this.isMobileDevice ? 4 : 6;
    const pillarSpacing = terrainLength / numPillars;

    for (let i = 0; i < numPillars; i++) {
      const zPosition = (pillarSpacing * i) - terrainLength / 2;
      
      // Pilares izquierdos (formas más simples)
      const leftPillar = MeshBuilder.CreateBox(`terrainPillar_left_${i}`, {
        width: 15, // Tamaño fijo para simplificar
        height: infiniteDepth * 0.6, // Reducir altura de pilares
        depth: 12
      }, this.scene);
      
      leftPillar.material = lowPolyRockMaterial;
      leftPillar.position = new Vector3(
        -(terrainWidth / 2 + 20), 
        baseY, // Alinear con la base
        zPosition
      );
      leftPillar.checkCollisions = false;
      leftPillar.isPickable = false;
      leftPillar.receiveShadows = false;

      // Pilares derechos
      const rightPillar = MeshBuilder.CreateBox(`terrainPillar_right_${i}`, {
        width: 15,
        height: infiniteDepth * 0.6, // Reducir altura de pilares
        depth: 12
      }, this.scene);
      
      rightPillar.material = lowPolyRockMaterial;
      rightPillar.position = new Vector3(
        (terrainWidth / 2 + 20), 
        baseY - infiniteDepth * 0.3, // Ajustar posición Y según la nueva base
        zPosition
      );
      rightPillar.checkCollisions = false;
      rightPillar.isPickable = false;
      rightPillar.receiveShadows = false;

      console.log(`🏛️ Pilares ${i} creados en Z: ${zPosition}`);
    }

    // Crear formaciones rocosas low-poly dispersas (solo en dispositivos potentes)
    if (!this.isMobileDevice || this.mobileOptimizationLevel === 'low') {
      const numRockFormations = 8;
      
      for (let i = 0; i < numRockFormations; i++) {
        const rockFormation = MeshBuilder.CreateBox(`rockFormation_${i}`, {
          width: 15 + Math.random() * 10,
          height: 200 + Math.random() * 300,
          depth: 15 + Math.random() * 10
        }, this.scene);
        
        rockFormation.material = lowPolyStoneMaterial;
        rockFormation.position = new Vector3(
          (Math.random() - 0.5) * (terrainWidth + 60),
          baseY - Math.random() * 100 - 200,
          (Math.random() - 0.5) * terrainLength
        );
        rockFormation.rotation = new Vector3(
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.6,
          (Math.random() - 0.5) * 0.3
        );
        rockFormation.checkCollisions = false;
        rockFormation.isPickable = false;
        rockFormation.receiveShadows = false;
      }
    }

    console.log('� Base low-poly con profundidad infinita creada exitosamente');
  }

  // Método público para finalizar la optimización de Angular
  public stopAngularOptimization(): void {
    if (this.home && typeof this.home.stopGameOptimization === 'function') {
      this.home.stopGameOptimization();
    }
  }

  // Método para limpiar recursos al salir del juego
  public dispose(): void {
    // Reactivar la detección de cambios de Angular antes de destruir
    this.stopAngularOptimization();
    
    // Limpiar recursos de Babylon.js
    if (this.scene) {
      this.scene.dispose();
    }
    if (this.engine) {
      this.engine.dispose();
    }
  }
}