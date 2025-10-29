import { CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { InicioPageRoutingModule } from './inicio-routing.module';

import { InicioPage } from './inicio.page'; 
import { PerfilComponent } from '../components/perfil/perfil.component';
import { ShopComponent } from '../components/shop/shop.component';
import { MapsComponent } from '../components/maps/maps.component';
import { GamesComponent } from '../components/games/games.component';
import { ConfigComponent } from '../components/config/config.component';
import { AuthComponent } from '../components/auth/auth.component';
import { MapaV2Component } from '../components/mapa-v2/mapa-v2.component';
import { ProfileComponent } from '../components/profile/profile.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    InicioPageRoutingModule, CommonModule, FormsModule],
  schemas: [NO_ERRORS_SCHEMA],
  declarations: [
    InicioPage, 
    PerfilComponent,
    ShopComponent,
    MapsComponent,
    GamesComponent,
    ConfigComponent,
    AuthComponent,
    MapaV2Component,
  ProfileComponent]
})
export class InicioPageModule {}
