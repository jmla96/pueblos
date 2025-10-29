import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, NgZone, ChangeDetectionStrategy } from '@angular/core';
import { BabylonSceneFour } from '../../game/scene-four';

interface GameState {
  score: number;
  distance: number;
  isRunning: boolean;
  isGameOver: boolean;
  speed: number;
  lives: number;
}

@Component({
  selector: 'app-fourthhome',
  templateUrl: './fourthhome.page.html',
  styleUrls: ['./fourthhome.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FourthhomePage implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('canvas3D', { static: true }) canvas3DRef!: ElementRef<HTMLCanvasElement>;
  
  private babylonScene: BabylonSceneFour | null = null;
  
  // Game state
  public gameState: GameState = {
    score: 0,
    distance: 0,
    isRunning: false,
    isGameOver: false,
    speed: 6,
    lives: 3
  };

  public showInstructions = true;
  public isLoading = true;
  private isGameRunning: boolean = false;

  constructor(
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) { }

  ngOnInit() {
  }

  ngAfterViewInit() {
    // Ejecutar inicialización fuera de Angular para evitar ciclos innecesarios
    this.ngZone.runOutsideAngular(() => {
      this.initializeBabylon();
    });
  }

  ngOnDestroy() {
    // Finalizar optimización en BabylonSceneFour si existe
    if (this.babylonScene) {
      this.babylonScene.stopAngularOptimization();
    }
    
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
      this.babylonScene = new BabylonSceneFour(canvas, this);
      // Listen to game state changes
      this.babylonScene.onGameStateChange((state: GameState) => {
        this.ngZone.run(() => {
          this.gameState = { ...state };
          this.cdr.detectChanges();
        });
      });
      window.addEventListener('resize', () => {
        // El nuevo BabylonSceneFour maneja el resize internamente
      });
      // Ocultar loader cuando la escena esté lista (en este caso, inmediatamente tras crearla)
      this.ngZone.run(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      });
      // Iniciar el juego automáticamente usando restartGame para regenerar el mundo correctamente
      if (this.babylonScene) {
        this.babylonScene.restartGame();
        this.showInstructions = false;
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('Error initializing Babylon scene:', error);
      this.ngZone.run(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      });
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
      this.babylonScene.restartGame();
      this.showInstructions = false;
    }
  }

  public showInstructionsModal(): void {
    this.showInstructions = true;
  }

  public hideInstructions(): void {
    this.showInstructions = false;
    // Mover el foco al botón de ayuda al cerrar el modal
    setTimeout(() => {
      const helpBtn = document.querySelector('ion-button[fill="clear"] ion-icon[name="help-circle-outline"]')?.parentElement;
      if (helpBtn && typeof (helpBtn as HTMLElement).focus === 'function') {
        (helpBtn as HTMLElement).focus();
      }
    }, 100);
  }

  public getScoreColor(): string {
    if (this.gameState.score < 100) return 'primary';
    if (this.gameState.score < 300) return 'warning';
    return 'success';
  }

  public getSpeedColor(): string {
    if (this.gameState.speed < 18) return 'medium';
    if (this.gameState.speed < 22) return 'warning';
    return 'danger';
  }

  public getLivesColor(): string {
    if (this.gameState.lives > 2) return 'success';
    if (this.gameState.lives > 1) return 'warning';
    return 'danger';
  }

  public getDistanceColor(): string {
    if (this.gameState.distance < 50) return 'primary';
    if (this.gameState.distance < 150) return 'success';
    return 'tertiary';
  }

  public getAltitudeColor(): string {
    // Como ya no tenemos altitude, usamos la velocidad como indicador
    if (this.gameState.speed < 8) return 'medium';
    if (this.gameState.speed < 10) return 'warning';
    return 'success';
  }

  // Mobile Touch Controls
  public onJumpTouch(event: Event): void {
    event.preventDefault();
    if (this.babylonScene && this.gameState.isRunning) {
      // Send jump command to the game
      (this.babylonScene as any).jump?.();
    }
  }

  public onLeftPress(): void {
    if (this.babylonScene) {
      // Send left press to game (slow down)
      (this.babylonScene as any).setLeftPressed?.(true);
    }
  }

  public onLeftRelease(): void {
    if (this.babylonScene) {
      // Send left release to game
      (this.babylonScene as any).setLeftPressed?.(false);
    }
  }

  public onRightPress(): void {
    if (this.babylonScene) {
      // Send right press to game (speed up)
      (this.babylonScene as any).setRightPressed?.(true);
    }
  }

  public onRightRelease(): void {
    if (this.babylonScene) {
      // Send right release to game
      (this.babylonScene as any).setRightPressed?.(false);
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