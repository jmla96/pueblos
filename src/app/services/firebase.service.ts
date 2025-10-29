import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { SessionService } from './session.service'; 

@Injectable({
  providedIn: 'root',
})
export class FirestoreService {
  constructor(
    private firestore: AngularFirestore, 
    private authServ: AuthService,  
    private sessionService: SessionService, 
  ) {}

  public setUser(character: any, userInfo: any) {
    let characterId;
    let name: string;
    let description: string;
    let email: string;
    let fireItem: any;
    let sessionItem: any;

    if(this.sessionService.getItem("id") === null) characterId = this.firestore.createId(); 
    else characterId = this.sessionService.getItem("id"); 

    if(userInfo === null){
      if(this.authServ.user != null && this.authServ.user.displayName != null || this.authServ.user.displayName != undefined){
        name = this.authServ.user.displayName;
        description = this.authServ.user.description;
        email = this.authServ.user.email;
      }
      else {
        name = "Anónimo";
        description = "Usuario anónimo";
        email = " ";
      }
      
      fireItem = { 
        id: characterId,
        name: name, 
        description: description,
        email: email,
        position: character?.position.x + ", " + character?.position.y + ", " + character?.position.z,
        rotation: character?.rotation.x + ", " + character?.rotation.y + ", " + character?.rotation.z,
        animation: character?.animations ?? ""
      }; 
      sessionItem = { 
        id: characterId,
        name: name, 
        description: description,
        email: email
      }; 
    }
    else {
      fireItem = userInfo;
      sessionItem = userInfo;
    }


    this.sessionService.setItem("userInfo", sessionItem);
    this.sessionService.setItem("id", characterId);

    this.addItem('characters', fireItem) 
      .catch((error) => {
        console.error('Error al agregar:', error);
      });
  }

  public updateUser(character: any, animations: any, placeId: string) {
    console.log('update')
    const characterId: string | null = this.sessionService.getItem("id");

    const updateItem = {
      position: character?.position.x + ", " + character?.position.y + ", " + character?.position.z,
      rotation: character?.rotation.x + ", " + character?.rotation.y + ", " + character?.rotation.z,
      animation: animations,
      place: placeId,
      service: "Firestore service updateUser"
    }
    if(characterId != null){
      this.updateItem("characters", characterId, updateItem, character);
    }
  }
  
  public getItems(collection: string, id: string, param: string): Observable<any[]> {
    return this.firestore.collection(collection, ref => ref.where(param, '==', id)).snapshotChanges(); 
  }
  
  public addItem(collection: string, data: any): Promise<any> {  
    const docRef = this.firestore.collection(collection).doc(data.id);
    return docRef.set(data);
  }

  // Leer un documento específico por ID
  public getItemById(collection: string, id: string): Observable<any> {
    return this.firestore.collection(collection).doc(id).valueChanges();
  }

  // Actualizar un documento existente
  public updateItem(collection: string, id: string, data: any, character?: any): Promise<void> { 
    return this.firestore.collection(collection).doc(id).update(data).catch((error) => {
      console.error('Error al actualizar:', error);
      if(character != null) this.setUser(character, null);
    });
  }

  // Eliminar un documento por ID
  public deleteItem(collection: string, id: string): Promise<void> {
    return this.firestore.collection(collection).doc(id).delete();
  }
  deleteUser(characterId: string, placeId: string): void {
    this.firestore
      .collection('characters')
      .doc(characterId)
      .delete()
      .then(() => console.log(`Datos del jugador ${characterId} eliminados del lugar ${placeId}`))
      .catch((error) => console.error('Error al eliminar datos del jugador:', error));
  }
}
