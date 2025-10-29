import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ThirdhomePageRoutingModule } from './thirdhome-routing.module';

import { ThirdhomePage } from './thirdhome.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ThirdhomePageRoutingModule
  ],
  declarations: [ThirdhomePage]
})
export class ThirdhomePageModule {}