import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { FourthhomePage } from './fourthhome.page';

const routes: Routes = [
  {
    path: '',
    component: FourthhomePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FourthhomePageRoutingModule {}