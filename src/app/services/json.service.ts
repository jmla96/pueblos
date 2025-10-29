import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class JsonService { 

  constructor(private http: HttpClient) {}

  /**
   * Método para obtener los datos del archivo JSON.
   * @returns Observable con los datos del JSON.
   */
  getJson(id: string): Observable<any> {
    if(id === 'finca') return this.http.get('')
    return this.http.get('assets/json/arq_'+id+'.json');
  }

  /**
   * Método para actualizar los datos del archivo JSON.
   * En un proyecto real, esto enviaría los datos actualizados al backend para persistirlos.
   * @param updatedData - Los datos actualizados.
   */
  updateJson(updatedData: any): void {
    console.log('Datos actualizados:', updatedData);
    // Simula una llamada a un backend para guardar los cambios.
    // Reemplaza esto con un POST o PUT real si tienes un servidor.
    // Ejemplo:
    // return this.http.post('http://backend-url/update-json', updatedData);
  }
}
