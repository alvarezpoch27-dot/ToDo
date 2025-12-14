import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import {
  AuthInterceptor,
  AuthGuard,
  AuthService,
  EncryptionService,
  ApiService,
  CameraService,
  GpsService,
  PermissionsService,
} from './core';

@NgModule({
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    HttpClientModule,
    AppRoutingModule,
    AppComponent,
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    // Core Services
    AuthService,
    EncryptionService,
    ApiService,
    CameraService,
    GpsService,
    PermissionsService,
    AuthGuard,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
