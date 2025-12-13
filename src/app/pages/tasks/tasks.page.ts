import { Component, OnInit } from '@angular/core';
import { IonicModule, AlertController } from '@ionic/angular';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { TaskService } from '../../service/task.service';
import { AuthService } from '../../service/auth.service';
import { Router } from '@angular/router';
import { Task } from '../../models/task';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.page.html',
  styleUrls: ['./tasks.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, DatePipe, DecimalPipe]
})
export class TasksPage implements OnInit {
  tasks$!: Observable<Task[]>;

  constructor(
    private taskService: TaskService,
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.tasks$ = this.taskService.getTasks();
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
          handler: () => {
            this.taskService.deleteTask(task.id);
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
}
