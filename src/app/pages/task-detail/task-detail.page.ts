import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { TaskService } from '../../services/task.service';
import { CameraService } from '../../services/camera.service';
import { LocationService } from '../../services/location.service';
import { Task } from '../../models/task';
import { Capacitor } from '@capacitor/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-task-detail',
  templateUrl: './task-detail.page.html',
  styleUrls: ['./task-detail.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule, DecimalPipe]
})
export class TaskDetailPage implements OnInit {
  isNew = true;
  taskId!: string;
  form!: FormGroup;

  photoUrl?: string;
  latitude?: number;
  longitude?: number;
  localPhotoPath?: string;
  accuracy?: number | undefined;
  saving = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private taskService: TaskService,
    private cameraService: CameraService,
    private locationService: LocationService,
    private authService: AuthService,
    private toastController: ToastController,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['']
    });
  }

  ngOnInit(): void {
    // ensure tasks are loaded (safe if already loaded)
    (async () => {
      const id = this.route.snapshot.paramMap.get('id');
      await this.taskService.ensureLoaded();

      if (id && id !== 'new') {
        const task = this.taskService.getTaskById(id);
        if (task) {
          this.isNew = false;
          this.taskId = id;
          this.form.patchValue({
            title: task.title,
            description: task.description
          });
          this.photoUrl = task.photoUrl;
          this.latitude = task.latitude;
          this.longitude = task.longitude;
          this.localPhotoPath = task.localPhotoPath;
          this.accuracy = task.accuracy;
        }
      }
    })();
  }

  async takePhoto(): Promise<void> {
    const localPath = await this.cameraService.takePhoto();
    if (localPath) {
      this.localPhotoPath = localPath;
      this.photoUrl = undefined;
    }
  }

  getPhotoSrc(): string | undefined {
    if (this.localPhotoPath) return Capacitor.convertFileSrc(this.localPhotoPath);
    return this.photoUrl;
  }

  async setLocation(): Promise<void> {
    const loc = await this.locationService.getCurrentPosition();
    if (!loc) {
      // keep null coords if failed
      this.latitude = undefined;
      this.longitude = undefined;
      this.accuracy = undefined;
      return;
    }

    this.latitude = loc.latitude;
    this.longitude = loc.longitude;
    this.accuracy = loc.accuracy;
  }

  save(): void {
    if (!this.form.valid) return;

    const payload: Partial<Task> & { title: string } = {
      title: this.form.get('title')!.value.trim(),
      description: this.form.get('description')!.value.trim(),
      photoUrl: this.photoUrl,
      localPhotoPath: this.localPhotoPath,
      latitude: this.latitude,
      longitude: this.longitude,
      accuracy: this.accuracy,
    };

    this.saving = true;

    try {
      if (this.isNew) {
        this.taskService.addTask(payload as any);
      } else {
        // only patch the editable fields; preserve done/createdAt/etc.
        this.taskService.updateTask(this.taskId, payload);
      }

      this.showToast(this.isNew ? 'Tarea creada' : 'Tarea actualizada');
    } catch (e) {
      this.showToast('Error al guardar', 'danger');
    } finally {
      this.saving = false;
      this.router.navigate(['/tasks']);
    }
  }

  private async showToast(message: string, color?: string) {
    const toast = await this.toastController.create({
      message,
      color,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }
}
