import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class LoginPage {
  email = '';
  password = '';
  loading = false;
  errorMessage = '';
  isRegister = false;

  get isRegisterMode() {
    return this.isRegister;
  }

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async submit() {
    this.loading = true;
    this.errorMessage = '';

    try {
      if (this.isRegister) {
        await this.authService.register(this.email, this.password);
      } else {
        await this.authService.login(this.email, this.password);
      }
      this.router.navigate(['/tasks']);
    } catch (err) {
      this.errorMessage = 'Credenciales inválidas';
    } finally {
      this.loading = false;
    }
  }

  toggleMode() {
    this.isRegister = !this.isRegister;
  }

  onSubmit() {
    return this.submit();
  }
}
