import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { SwiperContainer } from 'swiper/element';

@Component({
  selector: 'app-games',
  templateUrl: './games.component.html',
  styleUrls: ['./games.component.scss'],
})
export class GamesComponent implements OnInit {
  @ViewChild('swiperRef', { static: false }) swiperRef!: ElementRef<SwiperContainer>;
  
  public activeSlideIndex: number = 0; // Rastrear el slide activo

  minigames = [
    {
      id: 'secondhome',
      name: 'Espanta Duendes',
      img: '../../../assets/img/minigames/espantaduende_ia.png',
      description: 'Asusta a los duendes antes de que te atrapen.'
    },
    {
      id: 'thirdhome',
      name: 'Runner Jeep!',
      img: '../../../assets/img/minigames/runnerjeep_ia.png',
      description: 'Come manzanas y crece, ¡evita chocar contigo mismo!'
    },
    {
      id: 'fourthhome',
      name: 'Memory',
      img: '../../../assets/img/minigames/memory.png',
      description: 'Encuentra las parejas de cartas en el menor tiempo.'
    },
    {
      id: '2048',
      name: '2048',
      img: '../../../assets/img/minigames/2048.png',
      description: 'Combina los números hasta llegar a 2048.'
    }
  ];

  constructor(
        public router: Router) { }
  ngOnInit() {}

  nextSlide() {
    if (this.swiperRef && this.swiperRef.nativeElement) {
      this.swiperRef.nativeElement.swiper.slideNext();
    }
  }

  prevSlide() {
    if (this.swiperRef && this.swiperRef.nativeElement) {
      this.swiperRef.nativeElement.swiper.slidePrev();
    }
  }

  playGame(gameId: string) { 
    this.router.navigate(['/home/', gameId]);
  }

  slideChanged(event: any) {
    // Actualizar el índice del slide activo
    this.activeSlideIndex = event.detail[0].activeIndex;
  }

  goToActiveSlide() {
    // Obtener el juego activo basado en el índice
    const activeGame = this.minigames[this.activeSlideIndex];
    if (activeGame) {
      this.playGame(activeGame.id);
    }
  }
}
