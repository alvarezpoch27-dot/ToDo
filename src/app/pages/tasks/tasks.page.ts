import { Component, OnInit } from '@angular/core';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { Task } from '../../models/task';
import { Observable } from 'rxjs';
import { Capacitor } from '@capacitor/core';

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

  constructor(
    private taskService: TaskService,
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    await this.taskService.ensureLoaded();
    this.tasks$ = this.taskService.getTasks();
    this.syncing$ = this.taskService.isSyncing();
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
    const toast = await this.toastController.create({
      message: 'Sincronización completada',
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }
}
