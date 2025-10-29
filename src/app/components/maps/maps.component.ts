import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import Swiper from 'swiper'; 
import { SwiperContainer } from 'swiper/element'; 
import { Viewer } from "@babylonjs/viewer";
import { InicioPage } from 'src/app/inicio/inicio.page'; 
import { SessionService } from 'src/app/services/session.service';
import { FirestoreService } from 'src/app/services/firebase.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';

interface UserInfo {
  name: string;
  email?: string; // Puedes agregar más propiedades si las tiene
}

@Component({
  selector: 'app-maps',
  templateUrl: './maps.component.html',
  styleUrls: ['./maps.component.scss'],
})
export class MapsComponent {

  @ViewChild('swiperRef', { static: false }) swiperRef!: ElementRef<SwiperContainer>;

  swiper?: Swiper; 

  swiperParams = {
    slidesPerView: 3, 
  };

  swiperOptions = {
    slidesPerView: 3,
    spaceBetween: 10,
  };

  sliders = [{
    id: "basePrincipal",
    type: "base",
    img: "../../../assets/img/isla.png", 
    text: "basePrincipal",
    history: "Lorem"
  },{
    id: "mapav2",
    type: "base",
    img: "../../../assets/img/halo_1.png", 
    text: "Mapa Quindio",
    history: "Lorem"
  },{
    id: "finca",
    type: "base",
    img: "../../../assets/img/belen_1.png", 
    text: "Finca",
    history: "Lorem"
  },{
    id: "genovaQuindio",
    type: "base",
    img: "../../../assets/img/isla.png", 
    text: "Genova",
    history: "Lorem"
  },{
    id: "salentoQuindio",
    type: "base",
    img: "../../../assets/img/isla.png", 
    text: "Salento",
    history: "Lorem"
  },{
    id: "tebaidaQuindio",
    type: "base",
    img: "../../../assets/img/isla.png", 
    text: "tebaidaQuindio",
    history: "Lorem"
  },{
    id: "circasiaQuindio",
    type: "base",
    img: "../../../assets/img/isla.png", 
    text: "circasiaQuindio",
    history: "Lorem"
  },{
    id: "buenavistaQuindio",
    type: "base",
    img: "../../../assets/img/isla.png", 
    text: "buenavistaQuindio",
    history: "Lorem"
  },{
    id: "montenegroQuindio",
    type: "base",
    img: "../../../assets/img/isla.png", 
    text: "montenegroQuindio",
    history: "Lorem"
  },{
    id: "pijaoQuindio",
    type: "base",
    img: "../../../assets/img/isla.png", 
    text: "pijaoQuindio",
    history: "Lorem"
  }];
  viewer!: Viewer; 
  public user: any = {"photoURL": "Anonimo.jpg", "name" : "Anónimo", "isLogin" : false};
  public fincaId: string = "";
  public activeSlideIndex: number = 0; // Rastrear el slide activo
  
  constructor(
    public router: Router, 
    public inicio: InicioPage, 
    public session: SessionService, 
    private fire: FirestoreService,
    private firestore: AngularFirestore,
    private afAuth: AngularFireAuth, ) {  
      this.afAuth.authState.subscribe((user: any) => {
        console.log("user:",user)
        if(user) {
          this.user = {
            photoURL: user.photoURL,
            name: user.displayName,
            email: user.email,
            id: user.uid,
            isLogin: true
          };  
          this.fire.getItems("fincas", user.uid, "userId").subscribe((finca: any) => {  
            if(finca.length > 0){
              this.session.setItem('finca', finca[0].payload.doc.data());
              this.fincaId = finca[0].payload.doc.data().id; 
            } 
          });
        }
        else {  
          this.messageLogin();
        }
      });
  }
  generateRandomName() {
    const randomNames = [
      'Finca El Paraíso', 'Finca La Esperanza', 'Finca Los Pinos', 'Finca Bella Vista',
      'Finca El Mirador', 'Finca Las Brisas', 'Finca San Antonio', 'Finca El Encanto',
      'Finca La Cascada', 'Finca Los Girasoles', 'Finca Tierra Linda', 'Finca Monte Verde',
      'Finca La Providencia', 'Finca Las Palmeras', 'Finca El Horizonte', 'Finca Dulce Refugio',
      'Finca El Roble', 'Finca La Cabaña', 'Finca Rincón del Sol', 'Finca Valle Azul',
      'Finca Los Nogales', 'Finca El Ciprés', 'Finca El Manantial', 'Finca Las Margaritas',
      'Finca La Ilusión', 'Finca Los Arrayanes', 'Finca La Sombra', 'Finca Brisas del Campo',
      'Finca El Álamo', 'Finca Los Laureles', 'Finca La Estrella', 'Finca Vista Hermosa',
      'Finca La Montaña', 'Finca Santa Rosa', 'Finca Los Naranjos', 'Finca La Ladera',
      'Finca La Tranquilidad', 'Finca Los Cedros', 'Finca Senderos Verdes', 'Finca Sol Naciente',
      'Finca El Bambú', 'Finca La Pradera', 'Finca Luna Llena', 'Finca El Sauce',
      'Finca Aguas Claras', 'Finca Colina Verde', 'Finca Tierra de Sueños', 'Finca Río Sereno',
      'Finca Las Acacias', 'Finca Sol y Sombra', 'Finca Monte Escondido', 'Finca La Bonanza',
      'Finca El Laurel', 'Finca Viento Sur', 'Finca El Susurro', 'Finca Cielo Azul',
      'Finca Camino Real', 'Finca La Amistad', 'Finca La Fortaleza', 'Finca Las Orquídeas',
      'Finca Brisas del Río', 'Finca El Olivo', 'Finca Pinos de Oro', 'Finca Los Almendros',
      'Finca Milagro Verde', 'Finca La Paz', 'Finca El Edén', 'Finca Valles del Sol',
      'Finca El Arco Iris', 'Finca Del Bosque', 'Finca Monte de Luna', 'Finca La Cumbre',
      'Finca Rincón Escondido', 'Finca El Río Azul', 'Finca Las Amapolas', 'Finca Brisas del Valle'
  ];
  
    const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
    const name = document.getElementById('farmName') as HTMLInputElement;
    name.value = randomName;
  }

  onSubmit() { 
    const nameValue = (document.getElementById('farmName') as HTMLInputElement).value;
    const userString: any  = this.session.getItem('userInfo');  
    console.log(userString);
    if(this.fincaId && this.fincaId.length > 0){
      this.go(this.fincaId, 'finca');
    }
    else if(userString != null && userString != undefined){
      const fincaId = this.firestore.createId();
      const finca = {
        id: fincaId,
        name: nameValue,  
        userId: userString.id
      }
      this.session.setItem('finca', finca);
      this.fire.addItem("fincas", finca);

      this.go(fincaId, 'finca');
    }
    else {
      this.messageLogin();
    }
  }
  
  info = false;
  infoId: string = ""; 

 
  nextSlide() { 
    this.swiperRef.nativeElement.swiper.slideNext();
  }

  prevSlide() { 
    this.swiperRef.nativeElement.swiper.slidePrev();
  }

  go(id: string, type: string) {
    this.router.navigate(['/home'], {
      queryParams: { id: id, type: type }
    });
  }

  goToActiveSlide() {
    // Obtener el slide activo basado en el índice
    const activeSlide = this.sliders[this.activeSlideIndex];
    if (activeSlide) {
      // Lógica especial para la finca
      if (activeSlide.id === 'finca') {
        if (this.fincaId && this.fincaId.length > 0) {
          this.go(this.fincaId, 'finca');
        } else {
          // Si no hay finca creada, mostrar el modal de crear finca
          this.crearFinca();
        }
      } else {
        // Para los demás slides, usar go normal
        this.go(activeSlide.id, activeSlide.type);
      }
    }
  }

  activateSlide(index: number) {
    if (this.swiper) {
      this.swiper.slideTo(index); // Mueve al slide indicado
    }
  }

  showInfo(slideId: string, infoId: string) {
    if(infoId === 'mapav2'){
      this.inicio.mostrarMapa2 = true;
      return;
    }
    if(this.info === true){
      this.info = false;
      const elemento = document.getElementById(slideId);
      elemento?.classList.remove('showInfo');
    }
    else {
      this.info = true;
      this.infoId = slideId;
      const elemento = document.getElementById(slideId);
      elemento?.classList.add('showInfo');
    }
  }
  slideChanged(event: any) {  
    // Actualizar el índice del slide activo
    this.activeSlideIndex = event.detail[0].activeIndex;
    
    if(this.info){ 
      this.info = false;
      const elemento = document.getElementById(this.infoId);
      elemento?.classList.remove('showInfo');
    }
  }
  history(info: any) {
    
  }
  moreInfo(){

  } 
  crearFinca() {
    if(this.fincaId && this.fincaId.length > 0){
      this.go(this.fincaId, 'finca');
    }
    const create = document.getElementById('createFinca');
    if(create)
    create.style.display = "flex";
  }
  login(){
    const create = document.getElementById('createFinca');
    if(create)
    create.style.display = "none"; 
    this.inicio.closeAll("Auth"); 
  }

  messageLogin(){ 
    const message = document.getElementById('message') as HTMLInputElement; 
    message.innerText = "Debes iniciar sesión para crear una finca. ";
    
  }
}
