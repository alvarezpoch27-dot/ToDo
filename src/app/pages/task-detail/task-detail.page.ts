import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { TaskService } from '../../service/task.service';
import { CameraService } from '../../service/camera.service';
import { LocationService } from '../../service/location.service';
import { Task } from '../../models/task';
import { AuthService } from '../../service/auth.service';

@Component({
  selector: 'app-task-detail',
  templateUrl: './task-detail.page.html',
  styleUrls: ['./task-detail.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, DecimalPipe]
})
export class TaskDetailPage implements OnInit {
  isNew = true;
  taskId!: string;

  title = '';
  description = '';
  photoUrl?: string;
  latitude?: number;
  longitude?: number;
  saving = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private taskService: TaskService,
    private cameraService: CameraService,
    private locationService: LocationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id && id !== 'new') {
      const task = this.taskService.getTaskById(id);
      if (task) {
        this.isNew = false;
        this.taskId = id;
        this.title = task.title;
        this.description = task.description;
        this.photoUrl = task.photoUrl;
        this.latitude = task.latitude;
        this.longitude = task.longitude;
      }
    }
  }

  async takePhoto(): Promise<void> {
    const photo = await this.cameraService.takePhoto();
    if (photo) {
      this.photoUrl = photo;
    }
  }

  async setLocation(): Promise<void> {
    const loc = await this.locationService.getCurrentPosition();
    if (!loc) return;

    this.latitude = loc.latitude;
    this.longitude = loc.longitude;
  }

  save(): void {
    if (!this.title.trim()) return;

    const now = new Date().toISOString();
    const userId = this.authService.currentUserId!;

    const task: Task = {
      id: this.isNew ? crypto.randomUUID() : this.taskId,
      userId,
      title: this.title.trim(),
      description: this.description.trim(),
      photoUrl: this.photoUrl,
      latitude: this.latitude,
      longitude: this.longitude,
      done: false,
      createdAt: this.isNew ? now : this.taskService.getTaskById(this.taskId)!.createdAt,
      updatedAt: now,
    };

    if (this.isNew) {
      this.taskService.addTask(task);
    } else {
      this.taskService.updateTask(task.id, task);
    }

    this.router.navigate(['/tasks']);
  }
}
