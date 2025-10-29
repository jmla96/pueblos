import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { NavController } from '@ionic/angular';
import * as nipplejs from 'nipplejs';

import { BabylonSceneTwo } from '../../game/scene-two';

type ActivePowerUp = { type: 'health' | 'speed' | 'rapidFire'; remaining: number };

@Component({
  selector: 'app-secondhome',
  templateUrl: './secondhome.page.html',
  styleUrls: ['./secondhome.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecondhomePage implements AfterViewInit, OnDestroy {
  @ViewChild('renderCanvas', { static: false }) private readonly canvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('joystickZone', { static: false }) private readonly joystickZoneRef?: ElementRef<HTMLDivElement>;

  private _isSceneReady = false;
  public playerHealth = 100;
  public playerMaxHealth = 100;
  public activePowerUps: ActivePowerUp[] = [];
  public gameState: 'running' | 'paused' | 'gameOver' = 'running';
  private isGameRunning: boolean = false;

  public get isSceneReady(): boolean {
    return this._isSceneReady;
  }

  public get playerHealthPercent(): number {
    return this.playerMaxHealth > 0 ? (this.playerHealth / this.playerMaxHealth) * 100 : 0;
  }

  private sceneTwo?: BabylonSceneTwo;
  private joystickManager: ReturnType<typeof nipplejs.create> | null = null;

  constructor(
    private readonly ngZone: NgZone,
    private readonly navCtrl: NavController,
    private cdr: ChangeDetectorRef,
  ) {}

  ngAfterViewInit(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.sceneTwo = new BabylonSceneTwo(canvas, this);

      this.sceneTwo.onPlayerHealthChange((current, max) => {
        this.ngZone.run(() => {
          this.playerHealth = current;
          this.playerMaxHealth = max;
          this.cdr.detectChanges();
        });
      });
      this.sceneTwo.onPowerUpEffectsChange((effects) => {
        this.ngZone.run(() => {
          this.activePowerUps = effects;
          this.cdr.detectChanges();
        });
      });
      this.sceneTwo.onGameStateChange((state) => {
        this.ngZone.run(() => {
          this.gameState = state;
          this.cdr.detectChanges();
        });
      });
      this.setupJoystick();

      this.sceneTwo.onReady(() => {
        this.ngZone.run(() => {
          this._isSceneReady = true;
          this.cdr.detectChanges();
        });

        setTimeout(() => {
          const fabButton = document.querySelector('.shoot-fab ion-fab-button');
          const actualButton = (fabButton?.querySelector('button') || fabButton) as HTMLElement;
          if (actualButton) {
            this.sceneTwo?.bindShootButton(actualButton);
          }
        }, 100);
      });
    });
  }

  public onShoot(): void {
  }

  public onTogglePause(): void {
    if (!this.sceneTwo || this.gameState === 'gameOver') {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.sceneTwo?.togglePause();
    });
  }

  public onResume(): void {
    if (!this.sceneTwo) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.sceneTwo?.resume();
    });
  }

  public onRestart(): void {
    if (!this.sceneTwo) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.sceneTwo?.resetGame();
    });
  }

  public onExit(): void {
    this.joystickManager?.destroy();
    this.joystickManager = null;

    this.sceneTwo?.dispose();
    this.sceneTwo = undefined;

    this._isSceneReady = false;
    this.gameState = 'running';
    this.activePowerUps = [];

    this.navCtrl.navigateBack('/inicio');
  }

  public powerUpLabel(type: ActivePowerUp['type']): string {
    switch (type) {
      case 'health':
        return 'Salud +';
      case 'speed':
        return 'Velocidad';
      case 'rapidFire':
        return 'Disparo Rápido';
      default:
        return type;
    }
  }

  private setupJoystick(): void {
    const joystickZone = this.joystickZoneRef?.nativeElement;
    if (!joystickZone || !this.sceneTwo) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.joystickManager = nipplejs.create({
        zone: joystickZone,
        mode: 'dynamic',
        color: '#1976d2',
      });

      this.joystickManager.on('move', (_, data) => {
        const angle = data.angle?.degree ?? null;
        const distance = data.distance ?? null;
        this.sceneTwo?.setJoystickInput(angle, distance);
      });

      this.joystickManager?.on('end', () => {
        this.sceneTwo?.setJoystickInput(null, null);
      });
    });
  }

  ngOnDestroy(): void {
    if (this.sceneTwo) {
      this.sceneTwo.stopAngularOptimization();
    }
    
    if (this.isGameRunning) {
      this.cdr.reattach();
    }
    
    this.joystickManager?.destroy();
    this.joystickManager = null;
    this.sceneTwo?.dispose();
    this.sceneTwo = undefined;
  }

  public startGameOptimization(): void {
    this.isGameRunning = true;
    this.cdr.detach();
  }

  public stopGameOptimization(): void {
    this.isGameRunning = false;
    this.cdr.reattach();
    this.cdr.detectChanges();
  }
}
