import { Injectable } from '@angular/core';   
import { AnimationGroup, DirectionalLight, Mesh, MeshBuilder, Scene, ShadowGenerator, Vector3 } from '@babylonjs/core'; 

@Injectable({
  providedIn: 'root',
})
export class AnimationsService {
  constructor() {}
  
  public playAnimation(animationName: string, bucle: boolean, animationGroups: AnimationGroup[]): void {    
    animationGroups.forEach(anim => anim.stop());
    const animation = animationGroups.find(anim => anim.name === animationName);
    if (animation) {
      animation.play(bucle); 
    } else {
      console.warn(`Animación "${animationName}" no encontrada`);
    }
  }

  public stopAnyAnimation(animationGroups: AnimationGroup[]):void {
    animationGroups.forEach(anim => anim.stop());
  }

  getAllAnimations(scene: Scene): string[] {
    const animations: string[] = [];
  
    scene.meshes.forEach((mesh:any) => {
      if (mesh.animations) {
        mesh.animations.forEach((animation:any) => {
          animations.push(animation.name);
        });
      }
    });
  
    scene.animationGroups.forEach((animationGroup:any) => { 
        animations.push(animationGroup); 
    });
  
    return animations;
  }
}