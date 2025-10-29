import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { FourthhomePageRoutingModule } from './fourthhome-routing.module';

import { FourthhomePage } from './fourthhome.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FourthhomePageRoutingModule
  ],
  declarations: [FourthhomePage]
})
export class FourthhomePageModule {}