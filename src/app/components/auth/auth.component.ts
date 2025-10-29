import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { InicioPage } from 'src/app/inicio/inicio.page';
import { AuthService } from 'src/app/services/auth.service';
import { FirestoreService } from 'src/app/services/firebase.service';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
})
export class AuthComponent  implements OnInit { 
  constructor(
    private authService: AuthService, 
    private afAuth: AngularFireAuth, 
    public inicio: InicioPage, 
    private firebase: FirestoreService) {
      
    this.afAuth.authState.subscribe((user:any) => { 
      if(user) {
        user = {
          photoURL: user.photoURL,
          name: user.displayName,
          email: user.email,
          id: user.uid,
          service: "Auth component constructor"
        };  
        this.firebase.setUser(null, user);  
      } 
    });
   }
   
  ngOnInit() {}
  async signInWithGoogle() {
    const user = await this.authService.googleSignIn().then((user:any) => { 
      return user;
    }); 

    if(user){ 
      const infoSave = {
        id: user.uid,
        name: user.displayName,
        email: user.email,
        description: "Usuario de Google",
        service: "Auth component signInWithGoogle"
      }  
      this.firebase.setUser(null, infoSave);  
      this.inicio.closeAll('Maps');
      this.inicio.welcome = true;
    }
  }

  signOut() {
    const authd = this.authService.signOut();
    this.authService.user = authd;
  }
  closeAuth(){
    this.inicio.closeAll('Maps');
  }
}
