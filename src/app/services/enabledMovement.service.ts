import { Injectable } from '@angular/core';   
import { AnimationGroup, DirectionalLight, Mesh, MeshBuilder, Scene, ShadowGenerator, Vector3 } from '@babylonjs/core';
import { GizmoManagerService } from './gizmoManager.service';
import { AnimationsService } from './animations.service';
import { BabylonScene } from '../game/scene-one';
import { ObstructionService } from './obstruction.service';

@Injectable({
  providedIn: 'root',
})
export class EnableCharacterMovement {
  constructor(public gizmoService: GizmoManagerService, 
                public animationsServ: AnimationsService,
                public babylonScene: BabylonScene,
                public obstructionServ: ObstructionService) {}

  
    
  private lastExecutionTime = 0; // Timestamp de la última ejecución
  private fireInterval = 500; // Intervalo en milisegundos (por ejemplo, 100ms = 10 veces por segundo)

  EnableCharacterMovement(): void {
    if (!this.babylonScene.character) return;
  
    let speed = 0.20;
    const gravity = -0.4;
    const jumpForce = 0.4; 
    const inputMap: { [key: string]: boolean } = {};
    let verticalVelocity = 0;
    let isGrounded = true; 
    let currentAnimation: string | null = null;
  
    const playAnimationIfNotPlaying = (animation: string) => {
      if (currentAnimation !== animation) {
        this.animationsServ.playAnimation(animation, true, this.babylonScene.animationGroups);
        currentAnimation = animation;
      }
    };
  
    window.addEventListener('keydown', (evt) => {
      inputMap[evt.key] = true;
    });
  
    window.addEventListener('keyup', (evt) => {
      inputMap[evt.key] = false;
    });
  
    this.babylonScene.scene.onBeforeRenderObservable.add(() => {
      if (!this.babylonScene.character || !this.babylonScene.scene.activeCamera) return;
      
      const currentTime = performance.now(); // Obtén el tiempo actual en milisegundos
      if (currentTime - this.lastExecutionTime >= this.fireInterval) {
        this.babylonScene.fireFunctions();
        this.lastExecutionTime = currentTime; // Actualiza el timestamp de la última ejecución
      }


      this.obstructionServ.checkObstruction(this.babylonScene.camera, this.babylonScene.character, this.babylonScene.houseModels, this.babylonScene.scene);
      let movementVector = Vector3.Zero();
  
      window.addEventListener('keydown', (evt) => {
        if (evt.key === " " && this.babylonScene.character) { 
            this.babylonScene.character.position.y += 0.01; // Movimiento directo en Y
        }
    });
    
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
      if (inputMap['r']) {
        movementVector = movementVector.add(new Vector3(1, 1, 0));
      }
      if (inputMap['x']) {
        //this.sessionService.clear(); 
        const allAnimations = this.animationsServ.getAllAnimations(this.babylonScene.scene);
        console.log(allAnimations);
      }
      if (this.babylonScene.joystickInput.angle !== null && this.babylonScene.joystickInput.distance !== null) {
        if(Math.floor(this.babylonScene.joystickInput.distance) >= 0 && Math.floor(this.babylonScene.joystickInput.distance) <= 10){
          speed = 0.2;
        }
        else if (Math.floor(this.babylonScene.joystickInput.distance) >= 11 && Math.floor(this.babylonScene.joystickInput.distance) <= 40){
          speed = 0.4;
        }
        else {
          speed = 0.6;
        }
        const angleInRadians = (this.babylonScene.joystickInput.angle * Math.PI) / 180;
        const x = Math.cos(angleInRadians);
        const z = Math.sin(angleInRadians);
        movementVector = movementVector.add(new Vector3(x, 0, z).scale(this.babylonScene.joystickInput.distance / 50)); 
  
        
        if (this.babylonScene.joystickInput.distance > 50 && isGrounded) {
          verticalVelocity = jumpForce;
          isGrounded = false;
          playAnimationIfNotPlaying("Jumping");
        }
      }
  
      
      if (movementVector.length() > 0) {
        const camera = this.babylonScene.scene.activeCamera;
        const forward = camera.getDirection(new Vector3(0, 0, 1)).normalize();
        const right = camera.getDirection(new Vector3(1, 0, 0)).normalize();
  
        
        const adjustedMovement = right.scale(movementVector.x).add(forward.scale(movementVector.z));
        movementVector = adjustedMovement;
      }
  
      verticalVelocity += gravity;
  
      const move = movementVector.normalize().scale(speed);
      move.y = verticalVelocity;
  
      const wasGrounded = isGrounded;
      // Asegúrate de mover al personaje sin que quede atrapado en las paredes
      this.babylonScene.character.moveWithCollisions(move);

      // Verifica si el personaje está atravesando las paredes
      if (this.babylonScene.character.position.y <= 15) {
        verticalVelocity = 0;
        isGrounded = true;
        this.babylonScene.character.position.y -= this.babylonScene.character.getBoundingInfo().boundingBox.minimum.y;

        // Evita que el personaje se quede pegado a las paredes
        if (movementVector.length() > 0) {
          playAnimationIfNotPlaying("Walk");
        } else {
          playAnimationIfNotPlaying("Still");
        }
      }
        
      if (movementVector.length() > 0) {
        const direction = new Vector3(movementVector.x, 0, movementVector.z).normalize();
        const correctionAngle = Math.PI / 2;
        this.babylonScene.character.rotation.y = Math.atan2(-direction.x, -direction.z) + correctionAngle;
  
        if (isGrounded) {
          playAnimationIfNotPlaying("Walk");
        }
      } else if (isGrounded) {
        playAnimationIfNotPlaying("Still");
      } 
    });
  }
}