import { Injectable } from '@angular/core';
import { Camera, FreeCamera, Scene, Vector3, Viewport } from '@babylonjs/core';

@Injectable({
  providedIn: 'root'
})
export class MinimapService {

  constructor() { }
  public createMinimapCamera(scene: Scene, player: any): void {
    // 🟢 Crear la cámara del minimapa
    const minimapCamera = new FreeCamera("minimapCamera", new Vector3(0, 300, 0), scene);
    minimapCamera.setTarget(new Vector3(0, 0, 0));
    minimapCamera.mode = Camera.ORTHOGRAPHIC_CAMERA;

    // 🔲 Definir el área visible en el minimapa (más cerca del jugador)
    const size = 50; // Reducir el tamaño visible para acercar el minimapa
    minimapCamera.orthoLeft = -size;
    minimapCamera.orthoRight = size;
    minimapCamera.orthoTop = size;
    minimapCamera.orthoBottom = -size;

    // 🔳 Definir el área de pantalla que ocupará el minimapa
    const viewportSize = 0.2;
    minimapCamera.viewport = new Viewport(1 - viewportSize, 1 - viewportSize, viewportSize, viewportSize);

    // 🔒 Hacer que el minimapa no reciba input
    minimapCamera.inputs.clear(); // Desactiva controles
    (minimapCamera as any).inputs.attached = {}; // Evita conflictos

    // 🔎 Evitar que el minimapa renderice objetos no deseados (como nubes)
    minimapCamera.layerMask = 0x0FFFFFFF;
    scene.meshes.forEach((mesh: any) => {
        if (mesh.name.startsWith("cloud")) {
            mesh.layerMask = 0x10000000; // Asignar capa 1 a las nubes
        } else {
            mesh.layerMask = 0x0FFFFFFF; // Asignar capa 0 a otros objetos
        }
    });

    // ✅ Establecer cámaras activas para render (minimap + principal)
    if(scene.activeCamera) scene.activeCameras = [scene.activeCamera, minimapCamera];

    // 🎮 Hacer que la cámara del minimapa siga al jugador
    scene.onBeforeRenderObservable.add(() => {
        if (player && player.position) {
            minimapCamera.position.x = player.position.x;
            minimapCamera.position.z = player.position.z;
        }
    });
}
}
