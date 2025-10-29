import { Component, OnInit } from '@angular/core';
import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';

@Component({
  selector: 'app-mapa-v2',
  templateUrl: './mapa-v2.component.html',
  styleUrls: ['./mapa-v2.component.scss'],
})
export class MapaV2Component implements OnInit {
  private canvas!: HTMLCanvasElement;
  private engine!: BABYLON.Engine;
  private scene!: BABYLON.Scene;
  private parentMesh!: BABYLON.TransformNode;

  private minX = -100;
  private maxX = 100;
  private minZ = -100;
  private maxZ = 100;

  ngOnInit() {
    this.canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
    this.engine = new BABYLON.Engine(this.canvas, true);
    this.createScene();
    this.engine.runRenderLoop(() => this.scene.render());
    window.addEventListener("resize", () => {
      this.engine.resize();
      this.adjustCanvasSize();
    });
    this.adjustCanvasSize();
  }

  adjustCanvasSize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.engine.setSize(window.innerWidth, window.innerHeight);
  }

  createScene() {
    this.scene = new BABYLON.Scene(this.engine);
    
    const camera = new BABYLON.ArcRotateCamera(
      'camera', Math.PI / 3 , Math.PI / 3, 50, new BABYLON.Vector3(0, 5, 0), this.scene
    );
    camera.attachControl(this.canvas, true);
    camera.rotation.y = 10
    
    const hemiLight = new BABYLON.HemisphericLight('hemiLight', new BABYLON.Vector3(0, 1, 0), this.scene);
    hemiLight.intensity = 0.6;
    
    const dirLight = new BABYLON.DirectionalLight('dirLight', new BABYLON.Vector3(-1, -2, -1), this.scene);
    dirLight.position = new BABYLON.Vector3(50, 100, 50);
    dirLight.intensity = 2.0;
    
    this.parentMesh = new BABYLON.TransformNode("parentMesh", this.scene);
    
    BABYLON.SceneLoader.ImportMesh('', '../../../assets/modelos3D/maps/', 'mapav2.glb', this.scene, (meshes) => {
      meshes.forEach((mesh: any) => {
        mesh.isPickable = true; 
        mesh.parent = this.parentMesh;
      }); 
    });
    
    const dragBehavior = new BABYLON.PointerDragBehavior({ dragPlaneNormal: new BABYLON.Vector3(0, 1, 0) });
    dragBehavior.useObjectOrientationForDragging = false;
    this.parentMesh.addBehavior(dragBehavior);
    
    this.scene.onBeforeRenderObservable.add(() => {
      this.parentMesh.position.x = BABYLON.Scalar.Clamp(this.parentMesh.position.x, this.minX, this.maxX);
      this.parentMesh.position.z = BABYLON.Scalar.Clamp(this.parentMesh.position.z, this.minZ, this.maxZ);
    });

        // Palmas de cera (low poly)
    for(let i=0; i<12; i++) {
      const palma = BABYLON.MeshBuilder.CreateCylinder('palma'+i, {height: 10 + Math.random()*4, diameter: 0.4 + Math.random()*0.2, tessellation: 6}, this.scene);
      palma.position = new BABYLON.Vector3(-30 + Math.random()*60, palma.scaling.y*6, 20 + Math.random()*40);
      palma.parent = this.parentMesh;
      palma.material = new BABYLON.StandardMaterial('palmaMat'+i, this.scene);
      (palma.material as BABYLON.StandardMaterial).diffuseColor = new BABYLON.Color3(0.7, 0.8, 0.6);
      (palma.material as BABYLON.StandardMaterial).specularColor = new BABYLON.Color3(0,0,0);
      // Copa low poly
      const copa = BABYLON.MeshBuilder.CreatePolyhedron('copa'+i, {type: 2, size: 1.2 + Math.random()*0.5}, this.scene);
      copa.position = palma.position.add(new BABYLON.Vector3(0, palma.getBoundingInfo().boundingBox.extendSize.y + 2, 0));
      copa.parent = this.parentMesh;
      copa.material = new BABYLON.StandardMaterial('copaMat'+i, this.scene);
      (copa.material as BABYLON.StandardMaterial).diffuseColor = new BABYLON.Color3(0.2, 0.5 + Math.random()*0.3, 0.2);
      (copa.material as BABYLON.StandardMaterial).specularColor = new BABYLON.Color3(0,0,0);
    }

    // Cafetales (low poly)
    for(let i=0; i<16; i++) {
      const cafeto = BABYLON.MeshBuilder.CreatePolyhedron('cafeto'+i, {type: 1, size: 0.8 + Math.random()*0.3}, this.scene);
      cafeto.position = new BABYLON.Vector3(-15 + i*2 + Math.random(), 0.6, -30 + Math.sin(i)*2 + Math.random()*2);
      cafeto.parent = this.parentMesh;
      cafeto.material = new BABYLON.StandardMaterial('cafetoMat'+i, this.scene);
      (cafeto.material as BABYLON.StandardMaterial).diffuseColor = new BABYLON.Color3(0.1, 0.4 + Math.random()*0.2, 0.1);
      (cafeto.material as BABYLON.StandardMaterial).specularColor = new BABYLON.Color3(0,0,0);
    }

    // Casas coloniales detalladas (low poly)
    for(let c=0; c<3; c++) {
      // Base de la casa
      const casa = BABYLON.MeshBuilder.CreateBox('casa'+c, {height: 3, width: 5, depth: 4}, this.scene);
      casa.position = new BABYLON.Vector3(20 + c*10, 1.5, -10 + c*5);
      casa.parent = this.parentMesh;
      casa.material = new BABYLON.StandardMaterial('casaMat'+c, this.scene);
      (casa.material as BABYLON.StandardMaterial).diffuseColor = new BABYLON.Color3(0.95, 0.85, 0.7);
      (casa.material as BABYLON.StandardMaterial).specularColor = new BABYLON.Color3(0,0,0);
      // Techo colonial (ajustado al ancho de la casa)
      const tejado = BABYLON.MeshBuilder.CreateBox('tejado'+c, {height: 1, width: 5, depth: 4}, this.scene);
      tejado.position = casa.position.add(new BABYLON.Vector3(0, 2, 0));
      tejado.parent = this.parentMesh;
      tejado.material = new BABYLON.StandardMaterial('tejadoMat'+c, this.scene);
      (tejado.material as BABYLON.StandardMaterial).diffuseColor = new BABYLON.Color3(0.7, 0.2, 0.1);
      (tejado.material as BABYLON.StandardMaterial).specularColor = new BABYLON.Color3(0,0,0);
      // Puerta
      const puerta = BABYLON.MeshBuilder.CreateBox('puerta'+c, {height: 1.2, width: 0.7, depth: 0.2}, this.scene);
      puerta.position = casa.position.add(new BABYLON.Vector3(0, -0.4, 2.1));
      puerta.parent = this.parentMesh;
      puerta.material = new BABYLON.StandardMaterial('puertaMat'+c, this.scene);
      (puerta.material as BABYLON.StandardMaterial).diffuseColor = new BABYLON.Color3(0.5, 0.3, 0.1);
      (puerta.material as BABYLON.StandardMaterial).specularColor = new BABYLON.Color3(0,0,0);
      // Ventanas
      for(let w=0; w<2; w++) {
        const ventana = BABYLON.MeshBuilder.CreateBox('ventana'+c+'_'+w, {height: 0.7, width: 0.7, depth: 0.1}, this.scene);
        ventana.position = casa.position.add(new BABYLON.Vector3(-1.2 + w*2.4, 0.5, 2.1));
        ventana.parent = this.parentMesh;
        ventana.material = new BABYLON.StandardMaterial('ventanaMat'+c+'_'+w, this.scene);
        (ventana.material as BABYLON.StandardMaterial).diffuseColor = new BABYLON.Color3(0.2, 0.5, 0.8);
        (ventana.material as BABYLON.StandardMaterial).specularColor = new BABYLON.Color3(0,0,0);
      }
    }

    // Mariposa (escultura low poly)
    const mariposa = BABYLON.MeshBuilder.CreatePolyhedron('mariposa', {type: 4, size: 2}, this.scene);
    mariposa.position = new BABYLON.Vector3(10, 2, 20);
    mariposa.parent = this.parentMesh;
    mariposa.material = new BABYLON.StandardMaterial('mariposaMat', this.scene);
    (mariposa.material as BABYLON.StandardMaterial).diffuseColor = new BABYLON.Color3(0.9, 0.6, 0.1);
    (mariposa.material as BABYLON.StandardMaterial).specularColor = new BABYLON.Color3(0,0,0);
  } 
}