import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ThirdhomePage } from './thirdhome.page';

const routes: Routes = [
  {
    path: '',
    component: ThirdhomePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ThirdhomePageRoutingModule {}