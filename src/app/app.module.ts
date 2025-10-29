  import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
  import { BrowserModule } from '@angular/platform-browser';
  import { RouteReuseStrategy } from '@angular/router';

  import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

  import { AppComponent } from './app.component';
  import { AppRoutingModule } from './app-routing.module';
  import { HttpClientModule } from '@angular/common/http';  
  import { AngularFireModule } from '@angular/fire/compat'; 
  import { firebaseConfig } from 'src/environments/environment';
  import { AuthModule } from '@angular/fire/auth'; 

  @NgModule({
    declarations: [AppComponent],
    imports: [
      BrowserModule, 
      IonicModule.forRoot(), 
      AppRoutingModule, 
      HttpClientModule, 
      AngularFireModule.initializeApp(firebaseConfig),
      AuthModule, 
    ],
    providers: [{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy }],
    bootstrap: [AppComponent],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
  })
  export class AppModule {}
