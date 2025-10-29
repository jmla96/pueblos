import * as GUI from "@babylonjs/gui";
import { Injectable } from "@angular/core";
import { Mesh, Scene, Vector3 } from "@babylonjs/core";

@Injectable({
  providedIn: "root",
})
export class OptionsConstructionService {
  private guiManager: GUI.AdvancedDynamicTexture | null = null;
  private guiButtons: { [key: string]: GUI.Button } = {};

  constructor() {}

  initializeGUI(scene: Scene): void {
    // Crear el contenedor GUI si no existe
    if (!this.guiManager) {
      this.guiManager = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
    }

    // Crear botones para mover y rotar
    const moveButton = GUI.Button.CreateSimpleButton("moveButton", "Mover");
    moveButton.width = "100px";
    moveButton.height = "40px";
    moveButton.color = "white";
    moveButton.background = "blue";

    const rotateButton = GUI.Button.CreateSimpleButton("rotateButton", "Rotar");
    rotateButton.width = "100px";
    rotateButton.height = "40px";
    rotateButton.color = "white";
    rotateButton.background = "green";

    // Agregar botones al GUI
    this.guiManager.addControl(moveButton);
    this.guiManager.addControl(rotateButton);

    // Guardar referencias a los botones
    this.guiButtons["move"] = moveButton;
    this.guiButtons["rotate"] = rotateButton;
  }

  updateGUIPosition(selectedMesh: Mesh): void {
    if (this.guiManager && selectedMesh) {
      // Actualizar la posición del botón de mover
      const moveButton = this.guiButtons["move"];
      if (moveButton) {
        moveButton.linkWithMesh(selectedMesh);
        moveButton.linkOffsetY = -50; // Ajusta la posición vertical
      }

      // Actualizar la posición del botón de rotar
      const rotateButton = this.guiButtons["rotate"];
      if (rotateButton) {
        rotateButton.linkWithMesh(selectedMesh);
        rotateButton.linkOffsetY = -100; // Ajusta la posición vertical
      }
    }
  }

  setMoveAction(callback: () => void): void {
    const moveButton = this.guiButtons["move"];
    if (moveButton) {
      moveButton.onPointerClickObservable.clear();
      moveButton.onPointerClickObservable.add(callback);
    }
  }

  setRotateAction(callback: () => void): void {
    const rotateButton = this.guiButtons["rotate"];
    if (rotateButton) {
      rotateButton.onPointerClickObservable.clear();
      rotateButton.onPointerClickObservable.add(callback);
    }
  }
}