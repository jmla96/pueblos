import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, NgZone, ChangeDetectionStrategy } from '@angular/core';
import { BabylonSceneThree } from '../../game/scene-three';

interface GameState {
  score: number;
  isRunning: boolean;
  isGameOver: boolean;
  speed: number;
  lives: number;
}

@Component({
  selector: 'app-thirdhome',
  templateUrl: './thirdhome.page.html',
  styleUrls: ['./thirdhome.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThirdhomePage implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('canvas3D', { static: true }) canvas3DRef!: ElementRef<HTMLCanvasElement>;
  
  private babylonScene: BabylonSceneThree | null = null;
  
  // Game state
  public gameState: GameState = {
    score: 0,
    isRunning: false,
    isGameOver: false,
    speed: 10,
    lives: 3
  };

  public showInstructions = false;
  public isLoading = true;
  private isGameRunning: boolean = false;

  constructor(
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }

  ngOnInit() {
  }

  ngAfterViewInit() {
    // Usar NgZone para optimizar el rendimiento con Babylon.js
    this.ngZone.runOutsideAngular(() => {
      this.initializeBabylon();
    });
  }

  ngOnDestroy() {
    // Reactivar la detección de cambios al destruir el componente
    if (this.isGameRunning) {
      this.cdr.reattach();
    }
    
    if (this.babylonScene) {
      this.babylonScene.dispose();
    }
  }

  private async initializeBabylon(): Promise<void> {
    try {
      this.isLoading = true;
      const canvas = this.canvas3DRef.nativeElement;
      
      // Initialize Babylon scene
      this.babylonScene = new BabylonSceneThree(canvas, this);
      
      // Wait for scene to be ready before hiding loader
      this.babylonScene.onReady(() => {
        this.ngZone.run(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
          this.cdr.detach();
        });
      });
      
      // Listen to game state changes
      this.babylonScene.onGameStateChange((state: GameState) => {
        // Ejecutar en zona de Angular para actualizar la UI
        this.ngZone.run(() => {
          this.gameState = { ...state };
          this.cdr.detectChanges();
        });
      });

      // Setup resize handler
      window.addEventListener('resize', () => {
        if (this.babylonScene) {
          this.babylonScene.resize();
        }
      });

      
    } catch (error) {
      console.error('Error initializing Babylon scene:', error);
      this.isLoading = false;
      this.cdr.detectChanges(); // También forzar actualización en caso de error
    }
  }

  public startGame(): void {
    if (this.babylonScene) {
      this.babylonScene.startGame();
      this.showInstructions = false;
    }
  }

  public pauseGame(): void {
    if (this.babylonScene) {
      this.babylonScene.pauseGame();
    }
  }

  public resumeGame(): void {
    if (this.babylonScene) {
      this.babylonScene.resumeGame();
    }
  }

  public restartGame(): void {
    if (this.babylonScene) {
      this.babylonScene.startGame();
      this.showInstructions = false;
    }
  }

  public showInstructionsModal(): void {
    this.showInstructions = true;
  }

  public hideInstructions(): void {
    this.showInstructions = false;
  }

  public getScoreColor(): string {
    if (this.gameState.score < 500) return 'primary';
    if (this.gameState.score < 1000) return 'warning';
    return 'success';
  }

  public getSpeedColor(): string {
    if (this.gameState.speed < 15) return 'medium';
    if (this.gameState.speed < 20) return 'warning';
    return 'danger';
  }

  public getLivesColor(): string {
    if (this.gameState.lives > 2) return 'success';
    if (this.gameState.lives > 1) return 'warning';
    return 'danger';
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