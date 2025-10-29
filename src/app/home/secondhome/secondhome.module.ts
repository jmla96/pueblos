import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SecondhomePageRoutingModule } from './secondhome-routing.module';

import { SecondhomePage } from './secondhome.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SecondhomePageRoutingModule
  ],
  declarations: [SecondhomePage]
})
export class SecondhomePageModule {}
