import { Component, Input, OnInit, ChangeDetectorRef, NgZone, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { BabylonScene } from '../game/scene-one';
import * as nipplejs from 'nipplejs'; // Importar la librería del joystick
import { JsonService } from '../services/json.service';
import { FirestoreService } from '../services/firebase.service';
import { SessionService } from '../services/session.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { GizmoManagerService } from '../services/gizmoManager.service';
import { CreateObjectsService } from '../services/createObject.service';
import { AnimationsService } from '../services/animations.service';
import { ActivatedRoute, Router } from '@angular/router'; 
import { ObstructionService } from '../services/obstruction.service';
import { AuthService } from '../services/auth.service'; 
import { InfiniteRunnerService } from '../services/infiniteRunner.service';
import { MountainService } from '../services/montains.service';
import { MinimapService } from '../services/minimap.service'; 
import { Camera, Engine, FreeCamera, Scene, Vector3 } from '@babylonjs/core';
import { birdGameService } from '../services/bird-game.service';


@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements OnInit, OnDestroy {
  public babylonScene: BabylonScene | undefined;
  public isLoading: boolean = true;
  public listMeshes: boolean = false;
  private isGameRunning: boolean = false;

  constructor(private jsonService: JsonService, private firestoreService: FirestoreService,
      public sessionService: SessionService, private firestore: AngularFirestore,
      public gizmoService: GizmoManagerService,
      public createObjectServ: CreateObjectsService,
      public animationsServ: AnimationsService,
      public router: Router,
      public obstructionServ: ObstructionService,
      private route: ActivatedRoute,
      private authService: AuthService, 
    private infiniteRunnerService: InfiniteRunnerService,
    private mountainService: MountainService,
    private minimapService: MinimapService,
    private birdGameService: birdGameService,
  public cdr: ChangeDetectorRef,
    private ngZone: NgZone) {}

  ngOnInit() {
    // Optimización: Ejecutar inicialización fuera de la zona de Angular
    this.ngZone.runOutsideAngular(() => {
      this.initializeGame();
    });
  }

  private initializeGame() {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    
    this.route.queryParams.subscribe(params => { 
      this.babylonScene = new BabylonScene(
                            canvas, 
                            this.jsonService, 
                            this.firestoreService,
                            this.sessionService, 
                            this.firestore, 
                            this.gizmoService,
                            this.createObjectServ,
                            this.animationsServ,
                            this.obstructionServ,
                            params,
                            this,
                            this.authService, 
                            this.infiniteRunnerService,
                            this.mountainService, 
                        );
    });

    // Crear el joystick
    const joystickContainer = document.getElementById('joystick-container');
    const joystickManager = nipplejs.create({
      zone: joystickContainer!, // El contenedor donde estará el joystick
      mode: 'dynamic',          // Modo dinámico para libertad de movimiento
      color: 'blue',            // Color del joystick
    });

    // Escuchar eventos del joystick
    joystickManager.on('move', (_, data) => {
      const angle = data.angle.degree; // Ángulo de movimiento en grados
      const distance = data.distance; // Distancia desde el centro
      this.babylonScene?.setJoystickInput(angle, distance);
    });

    joystickManager.on('end', () => {
      this.babylonScene?.setJoystickInput(null, null); // Detener el movimiento al soltar el joystick
    }); 
  }

  changeAccessory(accessoryKey: string): void {
    this.babylonScene?.ChangeAccessory(accessoryKey);
  }
  scale(): void {
    this.babylonScene?.enableScaling();
  }
  position(): void {
    this.babylonScene?.enablePosition();
  }
  menu(){
    const menuOptions = document.getElementById('menuOptions');
    if(menuOptions){
      if(menuOptions.style.display === "flex"){
        menuOptions.style.display = "none";

        const cameraOpt = document.getElementById('cameraOptionsId');
        if(cameraOpt) cameraOpt.style.display = "none";
      }
      else {
        menuOptions.style.display = "flex";
      }
    }
  } 
  inicio() {
    const menuOptions = document.getElementById('menuOptions');
    if(menuOptions) menuOptions.style.display = "none";
    this.babylonScene?.scene.dispose();
    this.router.navigate(['/inicio']);
  }
  cameraOptions(){
    const cameraOptions = document.getElementById('cameraOptionsId');
    if(cameraOptions) {
      if(cameraOptions.style.display === "none") cameraOptions.style.display = "block";
      else if(cameraOptions.style.display === "block") cameraOptions.style.display = "none";
    } 
  }  
  enableVr(){
    this.babylonScene?.changeCamera();
  }
  construction(){
    this.router.navigate(['/construction']);
  }
  
  navigateToInfiniteRunner(){
    this.router.navigate(['/thirdhome']);
  }

  navigateToMountainRunner(){
    this.router.navigate(['/fourthhome']);
  }
  
  public addMesh(type: string) {
    this.listMeshes = true;
  }

  ngOnDestroy(): void {
    // Finalizar optimización en BabylonScene si existe
    if (this.babylonScene) {
      this.babylonScene.stopAngularOptimization();
    }
    
    // Reactivar la detección de cambios al destruir el componente
    if (this.isGameRunning) {
      this.cdr.reattach();
    }
  }

  // Métodos para optimización de rendimiento del juego
  public startGameOptimization(): void {
    this.isGameRunning = true;
    // Desactivar la detección automática de cambios para mejor rendimiento
    this.cdr.detach();
  }

  public stopGameOptimization(): void {
    this.isGameRunning = false;
    // Reactivar la detección de cambios
    this.cdr.reattach();
    // Forzar una detección manual
    this.cdr.detectChanges();
  }
}
