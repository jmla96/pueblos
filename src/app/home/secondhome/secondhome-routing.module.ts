import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SecondhomePage } from './secondhome.page';

const routes: Routes = [
  {
    path: '',
    component: SecondhomePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SecondhomePageRoutingModule {}
