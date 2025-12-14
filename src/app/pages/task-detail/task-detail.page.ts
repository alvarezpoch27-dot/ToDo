import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { TaskService, CameraService, LocationService } from '../../core';
import { Task } from '../../models/task';
import { Capacitor } from '@capacitor/core';
import { AuthService } from '../../core';
import { Logger } from '../../core/utils/logger.util';
import { environment } from '../../../environments/environment';

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
  errorMessage = '';

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

  private logger = new Logger('TaskDetailPage', environment.debug);

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

  async save(): Promise<void> {
    if (!this.form.valid) {
      this.errorMessage = 'Por favor, revisa los datos';
      return;
    }

    const titleControl = this.form.get('title');
    if (titleControl) {
      titleControl.setValue((titleControl.value as string).trim());
    }
    const descControl = this.form.get('description');
    if (descControl) {
      descControl.setValue((descControl.value as string).trim());
    }

    const payload: Partial<Task> & { title: string } = {
      title: this.form.get('title')!.value,
      description: this.form.get('description')!.value,
      photoUrl: this.photoUrl,
      localPhotoPath: this.localPhotoPath,
      latitude: this.latitude,
      longitude: this.longitude,
      accuracy: this.accuracy,
    };

    this.saving = true;
    this.errorMessage = '';

    try {
      if (this.isNew) {
        await this.taskService.addTask(payload as any);
        await this.showToast('Tarea creada exitosamente', 'success');
      } else {
        await this.taskService.updateTask(this.taskId, payload);
        await this.showToast('Tarea actualizada exitosamente', 'success');
      }
      await this.router.navigate(['/tasks']);
    } catch (e: any) {
      const msg = e?.message ?? 'Error desconocido';
      this.errorMessage = msg;
      await this.showToast(`Error: ${msg}`, 'danger');
      this.logger.error('Save error', e);
    } finally {
      this.saving = false;
    }
  }

  async cancel(): Promise<void> {
    await this.router.navigate(['/tasks']);
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
