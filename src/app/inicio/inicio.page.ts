import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';  
import { SessionService } from '../services/session.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { FirestoreService } from '../services/firebase.service';
import { MapsComponent } from '../components/maps/maps.component';
import { GamesComponent } from '../components/games/games.component';
import "@babylonjs/viewer";

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.page.html',
  styleUrls: ['./inicio.page.scss'],
})
export class InicioPage implements OnInit {

  @ViewChild(MapsComponent) mapsComponent!: MapsComponent;
  @ViewChild(GamesComponent) gamesComponent!: GamesComponent;

  constructor(
    public router: Router, 
    private sessionService: SessionService, 
    private afAuth: AngularFireAuth,
    private firebase: FirestoreService) {
    
    this.afAuth.authState.subscribe((user: any) => {
      if(user) {
        this.user = {
          photoURL: user.photoURL,
          name: user.displayName,
          email: user.email,
          id: user.uid,
          service: "Auth component constructor"
        };   
        this.firebase.setUser(null, this.user);
      } 
      else { 
        this.closeAll("Auth");
      }
    });
  }

  mostrarPerfil = false; 
  mostrarShop = false; 
  mostrarMaps = true; 
  mostrarGames = false; 
  mostrarConfig = false; 
  mostrarAuth = false; 
  mostrarMapa2 = false;
  welcome = false;
  
  public profile: boolean = false;

  user: any = {};

  ngOnInit() { 
    this.user = this.sessionService.getItem("userInfo");
    if(this.user === null) {
      this.user = { displayName: "Anónimo" };
    } 
  }  
  closeAll(toggleTo: string) {
    this.mostrarPerfil = false;
    this.mostrarShop = false;
    this.mostrarMaps = false;
    this.mostrarGames = false;
    this.mostrarConfig = false;
    this.mostrarAuth = false;
    this.mostrarMapa2 = false;

    if(toggleTo === "Perfil") {
      this.mostrarPerfil = true;
    }
  
    if(toggleTo === "Shop") {
      this.mostrarShop = true;
    }
  
    if(toggleTo === "Maps") {
      this.mostrarMaps = true;
    }
  
    if(toggleTo === "Games") {
      this.mostrarGames = true;
    }
  
    if(toggleTo === "Config") {
      this.mostrarConfig = true;
    }
  
    if(toggleTo === "Auth") {
      this.mostrarAuth = true;
    }
  
    if(toggleTo === "MapaV2") {
      this.mostrarMapa2 = true;
    }
  }

  welcomeFalse(){
    this.welcome = false;
  }
  
  profileMode(){
    this.profile = !this.profile;
  }

  goToActiveSlide() {
    // Determinar cuál componente está activo y llamar a su goToActiveSlide()
    if (this.mostrarMaps && this.mapsComponent) {
      // Si estamos en Maps, navegar al slide activo del mapa
      this.mapsComponent.goToActiveSlide();
    } else if (this.mostrarGames && this.gamesComponent) {
      // Si estamos en Games, navegar al slide activo del juego
      this.gamesComponent.goToActiveSlide();
    } else if (this.mostrarMaps) {
      // Si Maps está seleccionado pero el componente no está listo, usar el primer mapa
      this.router.navigate(['/home'], {
        queryParams: { id: 'basePrincipal', type: 'base' }
      });
    } else {
      // Por defecto, ir a Games y navegar al primer juego
      this.closeAll('Games');
      // Usar setTimeout para esperar a que el componente se inicialice
      setTimeout(() => {
        if (this.gamesComponent) {
          this.gamesComponent.goToActiveSlide();
        } else {
          // Fallback: ir directamente al primer juego
          this.router.navigate(['/home/secondhome']);
        }
      }, 100);
    }
  }
}
