import { Injectable } from '@angular/core'; 
import { GizmoManager, Mesh, SceneLoader, StandardMaterial, Vector3 } from '@babylonjs/core'; 

@Injectable({
  providedIn: 'root',
})
export class GizmoManagerService {
  constructor() {}
     async setupGizmoManager(position:any, scene: any, shadowG: any, gizmoManager: any): Promise<{gizmoManager:any}> {
        // Importa el modelo
        const { meshes } = await SceneLoader.ImportMeshAsync(
        "",
        "../../assets/modelos3D/",
        "house_2.glb",
        scene
        ); 

       
    
    const mainMesh = meshes.find((mesh: any) => mesh instanceof Mesh) as Mesh | undefined;

    if(mainMesh){
        
        mainMesh.position = position;
        mainMesh.rotation = new Vector3(0, 0, 0)
        mainMesh.checkCollisions = true;

        
        mainMesh.receiveShadows = true; // La malla recibe sombras
        shadowG.addShadowCaster(mainMesh); 
    }
    
        gizmoManager = new GizmoManager(scene); 
        
        gizmoManager.attachableMeshes = [mainMesh];
        gizmoManager.positionGizmoEnabled = true; 
        gizmoManager.rotationGizmoEnabled = true; 
        gizmoManager.scaleGizmoEnabled = true; 
        
        window.addEventListener("keydown", (event) => {
        switch (event.key) {
            case "w": 
            if (gizmoManager) {
                gizmoManager.positionGizmoEnabled = true;
                gizmoManager.rotationGizmoEnabled = false;
                gizmoManager.scaleGizmoEnabled = false;
            }
            break;
            case "e": 
            if (gizmoManager) {
                gizmoManager.positionGizmoEnabled = false;
                gizmoManager.rotationGizmoEnabled = true;
                gizmoManager.scaleGizmoEnabled = false;
            }
            break;
            case "r": 
            if (gizmoManager) {
                gizmoManager.positionGizmoEnabled = false;
                gizmoManager.rotationGizmoEnabled = false;
                gizmoManager.scaleGizmoEnabled = true;
            }
            break;
            case "b": 
            var count = 0;  
            break;
        }
        }); 
        return { gizmoManager: gizmoManager }
    }
}