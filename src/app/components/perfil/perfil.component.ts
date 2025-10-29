import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { InicioPage } from 'src/app/inicio/inicio.page';
import { AuthService } from 'src/app/services/auth.service';
import "@babylonjs/viewer";


@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss'],
})
export class PerfilComponent implements OnInit {
  isLogin: boolean = false;
  public user: any = {"photoURL": "Anonimo.jpg", "name" : ""}; 

  constructor(private inicio: InicioPage, private authServ: AuthService, private afAuth: AngularFireAuth) { }

  ngOnInit() {
    this.afAuth.authState.subscribe((user: any) => {
      if(user) {
        this.user = {
          photoURL: user.photoURL,
          name: user.displayName,
          email: user.email,
          id: user.uid
        };  
      } 
    });
  }

  login() {
    this.inicio.mostrarAuth = true;
    this.inicio.closeAll("Auth");
  }
}
