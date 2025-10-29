import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePage } from './home.page';

const routes: Routes = [
  {
    path: '',
    component: HomePage,
  },
  {
    path: 'secondhome',
    loadChildren: () => import('./secondhome/secondhome.module').then( m => m.SecondhomePageModule)
  },
  {
    path: 'thirdhome',
    loadChildren: () => import('./thirdhome/thirdhome.module').then( m => m.ThirdhomePageModule)
  },
  {
    path: 'fourthhome',
    loadChildren: () => import('./fourthhome/fourthhome.module').then( m => m.FourthhomePageModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HomePageRoutingModule {}
