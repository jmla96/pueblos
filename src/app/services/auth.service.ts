import { Injectable, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth'; 
import 'firebase/compat/auth';
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
 

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  public user: any = ''; 
  constructor(private afAuth: AngularFireAuth) {}

  async googleSignIn(): Promise<any> {
    const provider = new GoogleAuthProvider();
    
    const auth = getAuth();
    const authd = await signInWithPopup(auth, provider)
    .then((result): any => { 
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if(credential){
      const token = credential.accessToken; 
      const user = result.user;  
      return user;
    }
    }).catch((error) => {
      console.log(error);
    });
    return authd;
  }

  signOut() {
    return this.afAuth.signOut();
  }  
}
