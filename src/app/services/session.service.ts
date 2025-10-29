import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  
  constructor() {}

  // Guardar un dato en sessionStorage
  setItem(key: string, value: any): void {
    const user = JSON.stringify(value);
    sessionStorage.setItem(key, user); 
  }

  // Obtener un dato de sessionStorage
  getItem<T>(key: string): T | null {
    const data = sessionStorage.getItem(key);
    return data ? (JSON.parse(data) as T) : null;
  }

  // Eliminar un dato de sessionStorage
  removeItem(key: string): void {
    sessionStorage.removeItem(key);
  }

  // Limpiar todos los datos de sessionStorage
  clear(): void {
    sessionStorage.clear();
  }
}
