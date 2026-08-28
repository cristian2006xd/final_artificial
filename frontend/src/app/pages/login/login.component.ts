import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

type LoginMode = 'signin' | 'signup';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  mode: LoginMode = 'signin';

  name = '';
  email = '';
  password = '';

  submitted = false;
  loading = false;
  errorMessage: string | null = null;
  infoMessage: string | null = null;

  constructor(private auth: AuthService, private router: Router, private route: ActivatedRoute) {}

  setMode(mode: LoginMode): void {
    this.mode = mode;
    this.submitted = false;
    this.errorMessage = null;
    this.infoMessage = null;
  }

  async submit(): Promise<void> {
    this.submitted = true;
    this.errorMessage = null;
    this.infoMessage = null;

    if (this.mode === 'signup' && !this.name.trim()) {
      return;
    }
    if (!this.email.trim() || this.password.length < 6) {
      return;
    }

    this.loading = true;

    const error =
      this.mode === 'signup'
        ? await this.auth.signUp(this.name.trim(), this.email.trim(), this.password)
        : await this.auth.signIn(this.email.trim(), this.password);

    this.loading = false;

    if (error) {
      this.errorMessage = error;
      return;
    }

    if (this.mode === 'signup') {
      this.setMode('signin');
      this.infoMessage = 'Cuenta creada. Revisa tu correo si tu proyecto pide confirmación, o ya puedes iniciar sesión.';
      return;
    }

    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.router.navigateByUrl(returnUrl || '/');
  }
}
