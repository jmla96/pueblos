import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AbstractMesh, Ray, Animation } from '@babylonjs/core'; 

@Injectable({
  providedIn: 'root'
})
export class ObstructionService {

  constructor(public router: Router) { }

  
  checkObstruction(camera: any, character: any, houseModels: any, scene: any): void {
    if (!camera || !character || !houseModels || scene.going) {
      return;
    }
  
    const cameraPosition = camera.position.clone();
    const characterPosition = character.position.clone();
  
    const ray = new Ray(
      cameraPosition,
      characterPosition.subtract(cameraPosition).normalize(),
      cameraPosition.subtract(characterPosition).length()
    );
    
    const obstructingMeshes = new Set<AbstractMesh>();
  
    scene.multiPickWithRay(
      ray,
      (mesh: any) => { 
        return this.isMeshInHouseModels(mesh, houseModels);
      }
    )?.forEach((pickInfo: any) => {
      if (pickInfo.hit && pickInfo.pickedMesh && !scene.going) {
          if (pickInfo.pickedMesh.name.includes("entrada")) {
            scene.going = true;
            this.goTo(pickInfo.pickedMesh.name.substring(8), scene, "houses");
          } 
        const rootMesh = pickInfo.pickedMesh.parent || pickInfo.pickedMesh;
        obstructingMeshes.add(rootMesh as AbstractMesh);
      }
    });
    
    
    obstructingMeshes.forEach((mesh: AbstractMesh) => {
      if (!this.obstructingMeshes.has(mesh)) {
        this.fadeOutMeshGroup(mesh, scene); 
      }
    });
  
    
    this.obstructingMeshes.forEach((mesh: any) => {
      if (!obstructingMeshes.has(mesh)) { 
        this.fadeInMeshGroup(mesh, scene);  
      }
    });
  
    
    this.obstructingMeshes = obstructingMeshes;
  }
  
  
  private obstructingMeshes: Set<AbstractMesh> = new Set();
  private isMeshInHouseModels(mesh: AbstractMesh, houseModels: any): boolean {
    
    if (houseModels.includes(mesh)) {
      return true;
    }
  
    
    for (let model of houseModels) {
      if(model != null){
        if (model.getChildMeshes().includes(mesh)) {
          return true;
        }
      }
    }
  
    return false;
  } 

public fadeOutMeshGroup(mesh: AbstractMesh, scene: any): void { 
    const duration = 300;

    // Aplica a mesh y a todos sus hijos
    [mesh, ...mesh.getChildMeshes()].forEach((target) => {
        target.renderOutline = false;
        if (target.material && typeof target.material.alpha === "number") {
            const anim = new Animation(
                "fadeOutAlpha",
                "material.alpha",
                30,
                Animation.ANIMATIONTYPE_FLOAT,
                Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            const from = target.material.alpha;
            const to = 0.1; // O el valor mínimo que quieras
            anim.setKeys([
                { frame: 0, value: from },
                { frame: duration / 1000 * 30, value: to }
            ]);
            target.animations = [anim];
            scene.beginAnimation(target, 0, duration / 1000 * 30, false);
            // Asegura blending
            target.material.transparencyMode = 2;
            target.material.needDepthPrePass = true;
        }
    });
}

public fadeInMeshGroup(mesh: AbstractMesh, scene: any): void {
    const duration = 300;

    [mesh, ...mesh.getChildMeshes()].forEach((target) => {
        target.renderOutline = true;
        if (target.material && typeof target.material.alpha === "number") {
            const anim = new Animation(
                "fadeInAlpha",
                "material.alpha",
                30,
                Animation.ANIMATIONTYPE_FLOAT,
                Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            const from = target.material.alpha;
            const to = 1;
            anim.setKeys([
                { frame: 0, value: from },
                { frame: duration / 1000 * 30, value: to }
            ]);
            target.animations = [anim];
            scene.beginAnimation(target, 0, duration / 1000 * 30, false, 1.0, () => {
                // Al finalizar, asegurarse de que el material sea completamente opaco
                if (target.material) {
                    target.material.alpha = 1.0;
                    target.material.transparencyMode = null; // Restablecer modo de transparencia
                    target.material.needDepthPrePass = false;
                }
            });
        }
    });
}

  goTo(id: any, scene: any, type: string){
    scene.dispose();
    this.router.navigate(['/home'], {
      queryParams: { id: id, type: type }
    });
  }
}
