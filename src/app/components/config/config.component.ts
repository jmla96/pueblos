import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { InicioPage } from 'src/app/inicio/inicio.page';
import { AuthService } from 'src/app/services/auth.service';
import { SessionService } from 'src/app/services/session.service';

@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.scss'],
})
export class ConfigComponent  implements OnInit {

  public user: any = {"photoURL": "Anonimo.jpg", "name" : ""}; 

  constructor(
    private afAuth: AngularFireAuth, 
    public inicio: InicioPage, 
    private authService: AuthService,
    private sessionServ: SessionService) {

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

  ngOnInit() { 
  }
  
  login(){ 
    this.inicio.closeAll("Auth");
  }
  logout(){ 
    const authd = this.authService.signOut();
    this.sessionServ.removeItem("userInfo");
    this.sessionServ.removeItem("id");
    authd.then((user) => {
      console.log(user)  
    });
  }
}
