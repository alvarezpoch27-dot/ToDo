import { Component, OnInit } from '@angular/core';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { TaskService } from '../../core/services/task.service';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { Router } from '@angular/router';
import { Task } from '../../core/models';
import { Observable } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.page.html',
  styleUrls: ['./tasks.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, DatePipe, DecimalPipe]
})
export class TasksPage implements OnInit {
  tasks$!: Observable<Task[]>;
  syncing$!: Observable<boolean>;
  syncStatus$!: Observable<any>;
  apiEnabled$!: Observable<boolean>;

  constructor(
    private taskService: TaskService,
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    await this.taskService.ensureLoaded();
    this.tasks$ = this.taskService.getTasks();
    this.syncing$ = this.taskService.isSyncing();
    this.syncStatus$ = this.taskService.getSyncStatus();
    this.apiEnabled$ = new Observable(obs => {
      obs.next(!!environment.apiUrl);
      obs.complete();
    });
  }

  addTask() {
    this.router.navigate(['/task-detail', 'new']);
  }

  openDetail(task: Task) {
    this.router.navigate(['/task-detail', task.id]);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  async importFromServer() {
    const alert = await this.alertController.create({
      header: 'Importar tareas del servidor',
      message: '¿Descargar todas las tareas del servidor y fusionarlas con tus locales?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Importar',
          handler: async () => {
            try {
              await this.taskService.importFromServer((count) => {
                return new Promise(async (resolve) => {
                  const conf = await this.alertController.create({
                    header: 'Confirmación',
                    message: `Se van a importar ${count} tareas. ¿Continuar?`,
                    buttons: [
                      { text: 'No', role: 'cancel', handler: () => resolve(false) },
                      { text: 'Sí', handler: () => resolve(true) }
                    ]
                  });
                  await conf.present();
                });
              });
              const toast = await this.toastController.create({
                message: 'Importación completada',
                duration: 2000,
                color: 'success',
                position: 'bottom'
              });
              await toast.present();
            } catch (e: any) {
              const toast = await this.toastController.create({
                message: `Error: ${e?.message ?? 'Importación falló'}`,
                duration: 3000,
                color: 'danger',
                position: 'bottom'
              });
              await toast.present();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async deleteTask(task: Task) {
    const alert = await this.alertController.create({
      header: 'Eliminar tarea',
      message: `¿Estás seguro de que deseas eliminar "${task.title}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.taskService.deleteTask(task.id);
            const toast = await this.toastController.create({
              message: 'Tarea eliminada',
              duration: 2000,
              position: 'bottom'
            });
            await toast.present();
          }
        }
      ]
    });
    await alert.present();
  }

  toggleDone(task: Task) {
    this.taskService.toggleDone(task.id);
  }

  moveUp(task: Task) {
    this.taskService.moveTaskUp(task.id);
  }

  moveDown(task: Task) {
    this.taskService.moveTaskDown(task.id);
  }

  trackById(_: number, task: Task) {
    return task.id;
  }

  toSrc(task: Task): string | undefined {
    if (task.localPhotoPath) return Capacitor.convertFileSrc(task.localPhotoPath);
    return task.photoUrl;
  }

  async syncNow() {
    await this.taskService.syncNow();
  }
}
